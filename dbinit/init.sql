CREATE DATABASE IF NOT EXISTS credid_vc_provider;

USE credid_vc_provider;

DROP TABLE IF EXISTS `credid_vc_provider`.pii_access_log;
DROP TABLE IF EXISTS `credid_vc_provider`.user_information;
DROP TABLE IF EXISTS `credid_vc_provider`.`user`;
DROP TABLE IF EXISTS `credid_vc_provider`.field_credential_type;
DROP TABLE IF EXISTS `credid_vc_provider`.`field`;
DROP TABLE IF EXISTS `credid_vc_provider`.credential_type;

CREATE TABLE `credid_vc_provider`.credential_type (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    PRIMARY KEY (id)
);
INSERT INTO `credential_type`(`id`, `name`) VALUES(0,'EmailCredential');
INSERT INTO `credential_type`(`id`, `name`) VALUES(1,'DateOfBirthCredential');
INSERT INTO `credential_type`(`id`, `name`) VALUES(2,'CellPhoneCredential');
INSERT INTO `credential_type`(`id`, `name`) VALUES(3,'NameCredential');
INSERT INTO `credential_type`(`id`, `name`) VALUES(4,'EmploymentCredential');
INSERT INTO `credential_type`(`id`, `name`) VALUES(5,'AddressCredential');
INSERT INTO `credential_type`(`id`, `name`) VALUES(6,'SSNCredential');


CREATE TABLE `credid_vc_provider`.field (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    PRIMARY KEY (id)
);
INSERT INTO `field`(`id`,`name`) VALUES(0, 'firstName');
INSERT INTO `field`(`id`,`name`) VALUES(1, 'lastName');
INSERT INTO `field`(`id`,`name`) VALUES(2, 'email');
INSERT INTO `field`(`id`,`name`) VALUES(3, 'dob');
INSERT INTO `field`(`id`,`name`) VALUES(4, 'cellPhone');
INSERT INTO `field`(`id`,`name`) VALUES(5, 'street');
INSERT INTO `field`(`id`,`name`) VALUES(6, 'apt');
INSERT INTO `field`(`id`,`name`) VALUES(7, 'city');
INSERT INTO `field`(`id`,`name`) VALUES(8, 'state');
INSERT INTO `field`(`id`,`name`) VALUES(9, 'zip');
INSERT INTO `field`(`id`,`name`) VALUES(10, 'ssn');

CREATE TABLE `credid_vc_provider`.field_credential_type (
    `fieldId` INTEGER NOT NULL,
    `credentialTypeId` INTEGER NOT NULL,
    CONSTRAINT fk_fieldCredentialType_field_id FOREIGN KEY (fieldId) REFERENCES `field`(id),
    CONSTRAINT fk_fieldCredentialType_credentialType_id FOREIGN KEY (credentialTypeId) REFERENCES `credential_type`(id)
);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(0,3);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(1,3);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(2,0);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(3,1);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(4,2);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(5,5);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(6,5);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(7,5);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(8,5);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(9,5);
INSERT INTO `field_credential_type`(`fieldId`, `credentialTypeId`) VALUES(10,6);


CREATE TABLE `credid_vc_provider`.user (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `did` VARCHAR(255) NOT NULL UNIQUE,
    created_when TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    modified_when TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE `credid_vc_provider`.user_information (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    userId INTEGER NOT NULL,
    fieldId INTEGER NOT NULL,
    issueDate TIMESTAMP,
    expiryDate TIMESTAMP,
    `value` VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT fk_userInfo_user_id FOREIGN KEY (userId) REFERENCES `user`(id),
    CONSTRAINT fk_userInfo_field_id FOREIGN KEY (fieldId) REFERENCES `field`(id)
);

CREATE TABLE `credid_vc_provider`.pii_access_log (
    user_info_id INTEGER NOT NULL,
    pii_type ENUM ('raw', 'masked', 'tokenised'),
    created_when TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    reason ENUM('Analytics and Insights', 'Security', 'Customer Service', 'Transaction and Payments', 'Communication', 'Legal and Regulatory Compliance', 'Membership and Subscriptions'),
    CONSTRAINT fk_piiAccessLog_userInfo_id FOREIGN KEY (user_info_id) REFERENCES `user_information`(`id`)
);

DELIMITER $$

DROP PROCEDURE IF EXISTS `credid_vc_provider`.`pr_create_user`$$
CREATE PROCEDURE `credid_vc_provider`.`pr_create_user`(
    in_did VARCHAR(255)
)
BEGIN
    INSERT INTO user(`did`) VALUES(in_did);
    SELECT `id` AS id FROM user where `id`=LAST_INSERT_ID();
END $$

DROP PROCEDURE IF EXISTS `credid_vc_provider`.`pr_add_user_info`$$
CREATE PROCEDURE `credid_vc_provider`.`pr_add_user_info`(
    in_userId INTEGER,
    in_fieldName VARCHAR(255),
    in_value VARCHAR(255)
)
BEGIN
	DECLARE _now TIMESTAMP;
    DECLARE _fieldId VARCHAR(255);
    SET _now = CURRENT_TIMESTAMP;

    SELECT `id` INTO _fieldId FROM field WHERE `name` = in_fieldName;
    INSERT INTO user_information(userId, fieldId, issueDate, expiryDate, `value`) 
        VALUES (in_userId, _fieldId, _now, DATE_ADD(_now, INTERVAL 1 YEAR), in_value);
END $$

DROP PROCEDURE IF EXISTS `credid_vc_provider`.`pr_get_user_info`$$
CREATE PROCEDURE `credid_vc_provider`.`pr_get_user_info`(
    in_userId INTEGER
)
BEGIN
	SELECT 
        ui.id,
        ui.fieldId,
        f.`name`,
        ui.`value`,
        u.did,
        ui.issueDate,
        ui.expiryDate
    FROM user_information ui
    INNER JOIN user u ON u.id = ui.userId 
    INNER JOIN field f ON f.id = ui.fieldId
    WHERE u.id = in_userId;
END $$

DROP PROCEDURE IF EXISTS `credid_vc_provider`.`pr_get_credential_types`$$
CREATE PROCEDURE `credid_vc_provider`.`pr_get_credential_types`()
BEGIN
	SELECT 
        fct.fieldId,
        ct.`name`
    FROM field_credential_type fct
    INNER JOIN credential_type ct ON ct.id = fct.credentialTypeId;
END $$

DROP PROCEDURE IF EXISTS `credid_vc_provider`.`pr_store_pii_access`$$
CREATE PROCEDURE `credid_vc_provider`.`pr_store_pii_access`(
    in_userInfoId INTEGER,
    in_piiType VARCHAR(255),
    in_reason VARCHAR(255)
)
BEGIN
	INSERT INTO `credid_vc_provider`.pii_access_log
        (user_info_id, pii_type, reason)
    VALUES 
        (in_userInfoId, in_piiType, in_reason);
END $$

DROP PROCEDURE IF EXISTS `credid_vc_provider`.`pr_get_pii_requests`$$
CREATE PROCEDURE `credid_vc_provider`.`pr_get_pii_requests`(
    in_userId INTEGER
)
BEGIN
    DECLARE _rawCount INTEGER;
    DECLARE _maskedCount INTEGER;
    DECLARE _tokenisedCount INTEGER;
    DECLARE _totalFields INTEGER;

    SELECT count(*) INTO _totalFields FROM field;

	SELECT count(*)/_totalFields INTO _rawCount
    FROM credid_vc_provider.pii_access_log pal
    INNER JOIN user_information ui on ui.id = pal.user_info_id
    WHERE ui.userid = in_userId
        AND pii_type = 'raw';
    
    SELECT count(*)/_totalFields INTO _maskedCount
    FROM credid_vc_provider.pii_access_log pal
    INNER JOIN user_information ui on ui.id = pal.user_info_id
    WHERE ui.userid = in_userId
        AND pii_type = 'masked';

    SELECT count(*)/_totalFields INTO _tokenisedCount
    FROM credid_vc_provider.pii_access_log pal
    INNER JOIN user_information ui on ui.id = pal.user_info_id
    WHERE ui.userid = in_userId
        AND pii_type = 'tokenised';
    
    SELECT _rawCount AS rawCount,
        _maskedCount AS maskedCount,
        _tokenisedCount AS tokenisedCount;
END $$

DROP PROCEDURE IF EXISTS `credid_vc_provider`.`pr_get_traffic_source`$$
CREATE PROCEDURE `credid_vc_provider`.`pr_get_traffic_source`(
    in_userId INTEGER
)
BEGIN
	SELECT 
        pal.reason,
        count(*) AS count
    FROM credid_vc_provider.pii_access_log pal
    INNER JOIN user_information ui on ui.id = pal.user_info_id
    WHERE ui.userid = in_userId
    GROUP BY pal.reason;
END $$
DELIMITER ;