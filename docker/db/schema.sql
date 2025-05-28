--
-- Set character set the client will use to send SQL statements to the server
--
SET NAMES 'utf8';

--
-- Set default database
--
USE cruises;

--
-- Create table `company`
--
CREATE TABLE company (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  logoUrl VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 1525,
AVG_ROW_LENGTH = 327,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_unicode_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `idx_company_name` on table `company`
--
ALTER TABLE company 
  ADD INDEX idx_company_name(name);

--
-- Create table `ship`
--
CREATE TABLE ship (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  characteristics LONGTEXT BINARY CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`characteristics`)),
  companyId INT(11) DEFAULT NULL,
  PRIMARY KEY (id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 28643,
AVG_ROW_LENGTH = 135,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_unicode_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `idx_ship_company` on table `ship`
--
ALTER TABLE ship 
  ADD INDEX idx_ship_company(companyId);

--
-- Create index `idx_ship_name` on table `ship`
--
ALTER TABLE ship 
  ADD INDEX idx_ship_name(name);

--
-- Create foreign key
--
ALTER TABLE ship 
  ADD CONSTRAINT FK_2f977c9169e460ad5f56377785a FOREIGN KEY (companyId)
    REFERENCES company(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Create table `cruise`
--
CREATE TABLE cruise (
  id INT(11) NOT NULL AUTO_INCREMENT,
  travelDateFrom DATE NOT NULL,
  travelDateTo DATE NOT NULL,
  cruiseDateFrom DATE NOT NULL,
  cruiseDateTo DATE NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  extraInfo LONGTEXT BINARY CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`extraInfo`)),
  shipId INT(11) DEFAULT NULL,
  PRIMARY KEY (id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 34265,
AVG_ROW_LENGTH = 110,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_unicode_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `idx_cruise_ship_cruise_dates` on table `cruise`
--
ALTER TABLE cruise 
  ADD INDEX idx_cruise_ship_cruise_dates(shipId, cruiseDateFrom, cruiseDateTo);

--
-- Create index `idx_cruise_ship_travel_dates` on table `cruise`
--
ALTER TABLE cruise 
  ADD INDEX idx_cruise_ship_travel_dates(shipId, travelDateFrom, travelDateTo);

--
-- Create foreign key
--
ALTER TABLE cruise 
  ADD CONSTRAINT FK_91d1885e70e2285657f0587f705 FOREIGN KEY (shipId)
    REFERENCES ship(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Create table `point`
--
CREATE TABLE point (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(255) DEFAULT NULL,
  lat DECIMAL(10, 6) DEFAULT NULL,
  lng DECIMAL(10, 6) DEFAULT NULL,
  PRIMARY KEY (id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 295298,
AVG_ROW_LENGTH = 90,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_unicode_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `idx_point_lat_lng` on table `point`
--
ALTER TABLE point 
  ADD INDEX idx_point_lat_lng(lat, lng);

--
-- Create index `idx_point_name` on table `point`
--
ALTER TABLE point 
  ADD INDEX idx_point_name(name);

--
-- Create table `route`
--
CREATE TABLE route (
  id INT(11) NOT NULL AUTO_INCREMENT,
  date DATE NOT NULL,
  isTransit TINYINT(4) NOT NULL DEFAULT 0,
  extraInfo VARCHAR(255) DEFAULT NULL,
  shipId INT(11) DEFAULT NULL,
  pointId INT(11) DEFAULT NULL,
  PRIMARY KEY (id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 298497,
AVG_ROW_LENGTH = 38,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_unicode_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `IDX_dd82bd2a377569736e300947b7` on table `route`
--
ALTER TABLE route 
  ADD UNIQUE INDEX IDX_dd82bd2a377569736e300947b7(shipId, date);

--
-- Create index `idx_route_point_date` on table `route`
--
ALTER TABLE route 
  ADD INDEX idx_route_point_date(pointId, date);

--
-- Create foreign key
--
ALTER TABLE route 
  ADD CONSTRAINT FK_56bee8d47540ae2d1c398ec9b00 FOREIGN KEY (pointId)
    REFERENCES point(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Create foreign key
--
ALTER TABLE route 
  ADD CONSTRAINT FK_ac23a77a6695f0c899be84865c9 FOREIGN KEY (shipId)
    REFERENCES ship(id) ON DELETE NO ACTION ON UPDATE NO ACTION;