import database from "../config/mysql.config.js";
import Response from "../domain/response.js";
import logger from "../util/logger.js";
import HttpStatus from "../rest/HttpStatus.js";

export const getPIIRequestCountDAL = (tenantId, userDid) => {
  return new Promise((reject, resolve) => {
    database.query(
      "call credid_vc_provider.pr_get_pii_requests(?,?)",
      [tenantId, userDid],
      (error, results) => {
        if (error) {
          logger.info(
            `Error while getting pii request count tenantId=${tenantId} userId = ${userDid} error=${error} `
          );
          reject(
            new Response(
              HttpStatus.BAD_REQUEST.code,
              HttpStatus.BAD_REQUEST.status,
              "User did does not exists."
            )
          );
        } else {
          resolve(
            new Response(
              HttpStatus.OK.code,
              HttpStatus.OK.status,
              "success",
              results?.[0]?.[0] || {}
            )
          );
        }
      }
    );
  });
};

export const getTrafficSourceDal = (tenantId, userDid) => {
  return new Promise((reject, resolve) => {
    database.query(
      "call credid_vc_provider.pr_get_traffic_source(?,?)",
      [tenantId, userDid],
      (error, results) => {
        if (error) {
          logger.info(
            `Error while getting pii request count tenantId=${tenantId} userId = ${userDid} error=${error} `
          );
          reject(
            new Response(
              HttpStatus.BAD_REQUEST.code,
              HttpStatus.BAD_REQUEST.status,
              "User did does not exists."
            )
          );
        } else {
          const sourcesCount = results?.[0];
          let total = 0;
          sourcesCount.forEach((source) => {
            total += source.count;
          });
          const result = [];
          sourcesCount.forEach((source) => {
            result.push({
              reason: source.reason,
              percentAccess: 
                (source.count.toFixed(2) / total.toFixed(2)) *
                100
              ,
            });
          });

          resolve(
            new Response(
              HttpStatus.OK.code,
              HttpStatus.OK.status,
              "success",
              result
            )
          );
        }
      }
    );
  });
};

export const getLatestPIIRequestsDal = (tenantId, userDid) => {
  return new Promise((reject, resolve) => {
    database.query(
      "call credid_vc_provider.pr_get_latest_pii_requests(?,?)",
      [tenantId, userDid],
      (error, results) => {
        if (error) {
          logger.info(
            `Error while getting latests pii requests for tenantId=${tenantId} userId = ${userDid} error=${error} `
          );
          reject(
            new Response(
              HttpStatus.BAD_REQUEST.code,
              HttpStatus.BAD_REQUEST.status,
              "User id does not exists."
            )
          );
        } else {
          resolve(
            new Response(
              HttpStatus.OK.code,
              HttpStatus.OK.status,
              "success",
              results?.[0] || []
            )
          );
        }
      }
    );
  });
};

export const getMonthlyYearlyPiiReqCountsDal = (
  tenantId,
  userDid,
  startDateTime,
  endDateTime
) => {
  logger.info(`get user. tenantId=${tenantId} did=${userDid} startTime=${startDateTime} endTime=${endDateTime}`);
  return new Promise((reject, resolve) => {
    database.query(
      "call credid_vc_provider.pr_get_monthly_yearly_pii_request_count(?,?,?,?)",
      [tenantId, userDid, startDateTime || null, endDateTime || null],
      (error, results) => {
        if (error) {
          logger.info(
            `Error while getting latests pii requests for userId = ${userDid} error=${error} `
          );
          reject(
            new Response(
              HttpStatus.BAD_REQUEST.code,
              HttpStatus.BAD_REQUEST.status,
              "User did does not exists."
            )
          );
        } else {
          resolve(
            new Response(
              HttpStatus.OK.code,
              HttpStatus.OK.status,
              "success",
              results?.[0] || []
            )
          );
        }
      }
    );
  });
};

export const getTotalSecuredPIIDal = () => {
  logger.info(`get total secured pii.`);
  return new Promise((reject, resolve) => {
    database.query(
      "call credid_vc_provider.pr_get_total_secured_pii()",
      [],
      (error, results) => {
        if (error) {
          logger.info(
            `Error while getting total secured pii. error=${error} `
          );
          reject(
            new Response(
              HttpStatus.BAD_REQUEST.code,
              HttpStatus.BAD_REQUEST.status,
              error
            )
          );
        } else {
          resolve(
            new Response(
              HttpStatus.OK.code,
              HttpStatus.OK.status,
              "success",
              results?.[0]?.[0] || []
            )
          );
        }
      }
    );
  });
};