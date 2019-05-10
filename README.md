# bandwidth-port-out-validation

### Setup SQL table

```sql
CREATE TABLE `bandwidth-port-out-validation` (
  `Id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `TelephoneNumber` CHAR(10) NOT NULL,
  `AccountNumber` VARCHAR(20) NOT NULL,
  `Pin` VARCHAR(6) NOT NULL,
  `ZipCode` CHAR(5) NOT NULL,
  `SubscriberName` VARCHAR(255) NOT NULL,
  `Status` TINYINT(1) UNSIGNED NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `TelephoneNumber`(`TelephoneNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

### Default configuration options

```json
{
  "timezone": "UTC",
  "port": 3000,
  "path": "/",
  "verifyAccountNumber": true,
  "verifyPin": true,
  "verifyZipCode": true,
  "verifyStatus": true,
  "verifySubscriberName": false,
  "maxTelephoneNumbers": 100,
  "tableName": "bandwidth-port-out-validation",
  "mysql": {
    "host": "127.0.0.1",
    "port": 3306,
    "database": "bandwidth-port-out-validation",
    "user": "bandwidth-port-out-validation"
  }
}
```

### Start or restart

```bash
npm start
```

### Stop

```bash
npm stop
```
