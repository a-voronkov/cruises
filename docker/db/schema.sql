--
-- Set character set the client will use to send SQL statements to the server
--
SET NAMES 'utf8';

--
-- Set default database
--
USE cruises;

--
-- Create table `ships`
--
CREATE TABLE ships (
  ship_id INT(11) NOT NULL AUTO_INCREMENT,
  ship_name VARCHAR(255) NOT NULL,
  company_id INT(11) DEFAULT NULL,
  PRIMARY KEY (ship_id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 34268,
AVG_ROW_LENGTH = 45,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_uca1400_ai_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `idx_ship_company` on table `ships`
--
ALTER TABLE ships 
  ADD INDEX idx_ship_company(company_id);

--
-- Create index `idx_ship_name` on table `ships`
--
ALTER TABLE ships 
  ADD UNIQUE INDEX idx_ship_name(ship_name);

--
-- Create table `points`
--
CREATE TABLE points (
  point_id INT(11) NOT NULL AUTO_INCREMENT,
  point_name VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  lat DECIMAL(9, 6) DEFAULT NULL,
  lng DECIMAL(9, 6) DEFAULT NULL,
  PRIMARY KEY (point_id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 298497,
AVG_ROW_LENGTH = 78,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_uca1400_ai_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `idx_point_name` on table `points`
--
ALTER TABLE points 
  ADD UNIQUE INDEX idx_point_name(point_name);

--
-- Create table `cruises`
--
CREATE TABLE cruises (
  cruise_id INT(11) NOT NULL AUTO_INCREMENT,
  cruise_code VARCHAR(100) DEFAULT NULL,
  cruise_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  days INT(11) NOT NULL,
  nights INT(11) NOT NULL,
  PRIMARY KEY (cruise_id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 34265,
AVG_ROW_LENGTH = 108,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_uca1400_ai_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create table `stops`
--
CREATE TABLE stops (
  stop_id INT(11) NOT NULL AUTO_INCREMENT,
  point_id INT(11) NOT NULL,
  date DATE NOT NULL,
  ship_id INT(11) NOT NULL,
  cruise_id INT(11) NOT NULL,
  stop_order INT(11) DEFAULT NULL,
  PRIMARY KEY (stop_id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 298497,
AVG_ROW_LENGTH = 93,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_uca1400_ai_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `IDX_stops` on table `stops`
--
ALTER TABLE stops 
  ADD INDEX IDX_stops(date, stop_order);

--
-- Create foreign key
--
ALTER TABLE stops 
  ADD CONSTRAINT stops_ibfk_1 FOREIGN KEY (point_id)
    REFERENCES points(point_id);

--
-- Create foreign key
--
ALTER TABLE stops 
  ADD CONSTRAINT stops_ibfk_2 FOREIGN KEY (ship_id)
    REFERENCES ships(ship_id);

--
-- Create foreign key
--
ALTER TABLE stops 
  ADD CONSTRAINT stops_ibfk_3 FOREIGN KEY (cruise_id)
    REFERENCES cruises(cruise_id);

--
-- Create table `companies`
--
CREATE TABLE companies (
  company_id INT(11) NOT NULL AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (company_id)
)
ENGINE = INNODB,
AUTO_INCREMENT = 34270,
AVG_ROW_LENGTH = 327,
CHARACTER SET utf8mb4,
COLLATE utf8mb4_uca1400_ai_ci,
ROW_FORMAT = DYNAMIC;

--
-- Create index `idx_company_name` on table `companies`
--
ALTER TABLE companies 
  ADD UNIQUE INDEX idx_company_name(company_name);