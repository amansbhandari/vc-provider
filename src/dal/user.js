import database from "../config/mysql.config.js";
import Response from "../domain/response.js";
import logger from "../util/logger.js";
import HttpStatus from "../rest/HttpStatus.js";
import MaskData from "maskdata";

const maskCardOptions = {
  maskWith: "*",
  unmaskedStartDigits: 3,
  unmaskedEndDigits: 2,
  maskAtTheRate: false,
};

export const createUserDAL = (did, data) => {
  logger.info(`create user. did=${did}, data=${JSON.stringify(data)}`);

  return new Promise((resolve, reject) => {
    database.query(
      "call credid_vc_provider.pr_create_user(?)",
      [did],
      (error, results) => {
        if (!results) {
          reject(
            new Response(
              HttpStatus.BAD_REQUEST.code,
              HttpStatus.BAD_REQUEST.status,
              "DID already exists."
            )
          );
        } else {
          const userId = results?.[0]?.[0].id;
          let piiAdded = 0;

          Object.keys(data).forEach(async (key) => {
            await database.query(
              "call credid_vc_provider.pr_add_user_info(?,?,?)",
              [userId, key, data[key]],
              (error, results) => {
                if (error) {
                  resolve(
                    new Response(
                      HttpStatus.INTERNAL_SERVER_ERROR.code,
                      HttpStatus.INTERNAL_SERVER_ERROR.status,
                      `Unable to add info`
                    )
                  );
                } else {
                  piiAdded++;
                  if (piiAdded === Object.keys(data).length) {
                    resolve(
                      new Response(
                        HttpStatus.OK.code,
                        HttpStatus.OK.status,
                        `success`
                      )
                    );
                  }
                }
              }
            );
          });
        }
      }
    );
  });
};

export const getUserDAL = (id) => {
  logger.info(`get user. id=${id}`);

  return new Promise((resolve, reject) => {
    database.query(
      "call credid_vc_provider.pr_get_user_info(?)",
      [id],
      (error, results) => {
        if (!results) {
          reject(
            new Response(
              HttpStatus.BAD_REQUEST.code,
              HttpStatus.BAD_REQUEST.status,
              "User id does not exist"
            )
          );
        } else {
          const userInfo = results?.[0];
          database.query(
            "call credid_vc_provider.pr_get_credential_types()",
            [],
            (error, results) => {
              const fieldCredTypes = results?.[0];
              console.log("..fieldCredTypes", JSON.stringify(fieldCredTypes));
              console.log("..user", JSON.stringify(userInfo));

              let credTypes = fieldCredTypes.map((cred) => cred.name);
              let uniqueCredNameTypes = [...new Set(credTypes)];

              const response = [];

              uniqueCredNameTypes.forEach((credTypeName) => {
                const matchedCredTypes = fieldCredTypes.filter(
                  (fieldCred) => fieldCred.name === credTypeName
                );
                const credentialsSubject = {};
                const maskedSubject = {};
                const tokenisedSubject = {};

                let issuanceDate, expirationDate;
                matchedCredTypes.forEach((credTypeField) => {
                  const infos = userInfo.filter(
                    (info) => info.fieldId === credTypeField.fieldId
                  );
                  const info = infos?.[0];

                  if (info) {
                    credentialsSubject[info.name] = info.value;
                    credentialsSubject["id"] = info.did;

                    maskedSubject[info.name] = mask(info.value, credTypeName);
                    maskedSubject["id"] = info.did;

                    tokenisedSubject[info.name] = convertString(info.value);
                    tokenisedSubject["id"] = info.did;

                    issuanceDate = info.issueDate;
                    expirationDate = info.expiryDate;
                  }
                });
                response.push({
                  context: [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://www.schema.org",
                  ],
                  type: ["VerifiedCredential", credTypeName],
                  issuer: "https://example.com/issuer",
                  issuanceDate,
                  expirationDate,
                  credentialsSubject,
                  maskedSubject,
                  tokenisedSubject,
                });
              });

              resolve(
                new Response(HttpStatus.OK.code, HttpStatus.OK.status, response)
              );
            }
          );
        }
      }
    );
  });
};

const mask = (input, type) => {
  type = type.toLowerCase();

  if (type.includes("email")) {
    return MaskData.maskEmail2(input, {
      maskWith: "*",
      unmaskedStartCharactersBeforeAt: 3,
      unmaskedEndCharactersAfterAt: 2,
      maskAtTheRate: false,
    });
  } else if (type.includes("cell")) {
    return MaskData.maskPhone(input, {
      maskWith: "*",
      unmaskedStartDigits: 0,
      unmaskedEndDigits: 4,
    });
  } else if (type.includes("dob")) {
    return MaskData.maskCard(input, {
      maskWith: "*",
      unmaskedStartDigits: 2,
      unmaskedEndDigits: 1,
    });
  } else {
    return `${input}`
      .slice(-(input.length / 3))
      .padStart(`${input}`.length, "*");
  }
};

function convertString(inputString) {
  // Define a shift value (you can change this to any number you like)
  let shift = 9; // For example, shift each character by 3 positions

  let result = "";

  for (let i = 0; i < inputString.length; i++) {
    const char = inputString.charAt(i);
    shift = (shift + 2) % 9;
    
    // Check if the character is an uppercase letter
    if (/[A-Z]/.test(char)) {
      // Shift uppercase letters, wrap around if necessary
      const shiftedChar = String.fromCharCode(
        ((char.charCodeAt(0) - 65 + shift) % 26) + 65
      );
      result += shiftedChar;
    } else if (/[a-z]/.test(char)) {
      // Shift lowercase letters, wrap around if necessary
      const shiftedChar = String.fromCharCode(
        ((char.charCodeAt(0) - 97 + shift) % 26) + 97
      );
      result += shiftedChar;
    } else if (/[0-9]/.test(char)){
      // Shift lowercase letters, wrap around if necessary
      const shiftedChar = String.fromCharCode(
        ((char.charCodeAt(0) - 48 + shift) % 9) + 48
      );
      result += shiftedChar;
    }
    else {
      // Keep characters unchanged
      result += char;
    }
  }

  return result;
}