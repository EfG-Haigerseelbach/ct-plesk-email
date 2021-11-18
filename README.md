# ChurchTools-Plesk-E-Mail Integration

## Installation

1. Clone this repository `git clone https://github.com/EfG-Haigerseelbach/ct-plesk-email.git`
2. Change to directory `ct-plesk-email`
3. Run command `npm install`
4. Change to directory `ct-plesk-email\config`
5. Copy `template.json` to `default.json`
6. Edit `default.json` according to your needs. Refer to section **Configuration**

## Configuration

### ChurchTools API

| Parameter   | Data Type | Default | Possible Values | Explanation                                                                                                  |
|-------------|-----------|---------|-----------------|--------------------------------------------------------------------------------------------------------------|
| `url`       | string    | empty   | n/a             | This is the URL of your ChurchTools instance. If hosted, the pattern is `https://<church-name>.church.tools` |
| `username`  | string    | empty   | n/a             | Name of the user to authenticate against the ChurchTools API                                                 |
| `password`  | string    | empty   | n/a             | Password of this user                                                                                        |
| `log_level` | number    | 1       | 0,1,2,4         | Log-level of the ChurchTools client. 0 = no output. 1 = errors. 2 = info. 4 = debug.                         |

### ChurchTools Tags

| Parameter            | Data Type | Default           | Possible Values | Explanation                                                                                     |
|----------------------|-----------|-------------------|-----------------|-------------------------------------------------------------------------------------------------|
| `forwarding_mailbox` | string    | E-Mail Forwarding | n/a             | The name of the tag which shall indicate that a forwarding-mailbox shall be there for the user  |
| `mailbox`            | string    | E-Mail Mailbox    | n/a             | The name of the tag which shall indicate that a (usual) mailbox shall be there for the user     |

### Domain name for governed Mailboxes

| Parameter                    | Data Type | Default | Possible Values | Explanation                                                                                     |
|------------------------------|-----------|---------|-----------------|-------------------------------------------------------------------------------------------------|
| `domainForGovernedMailboxes` | string    | empty   | n/a             | This is your own domain you use for your mailboxes and where plesk runs. Example: `example.org` |

### E-mail Notification

| Parameter  | Data Type | Default | Possible Values  | Explanation                                                                                                                                                                                                         |
|------------|-----------|---------|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `enabled`  | boolean   | `false` | `true`, `false`  | Controls whether or not the e-mail notification is enabled. If enabled, an e-mail is sent for the following situations: (1) creation of a mailbox, (2) creation of a forwarding-mailbox, (3) removal of any mailbox |
| `host`     | string    | empty   | n/a              | Hostname providing the e-mail functionalities. Example: example.org                                                                                                                                                 |
| `port`     | number    | 465     | 465, 587         | SMTP-port                                                                                                                                                                                                           |
| `secure`   | boolean   | `true`  | `true`, `false`  | To send messages via SMTP securely use `true` and configure `port` to be 465. Otherwise use `false` and port 587.                                                                                                   |
| `user`     | string    | empty   | n/a              | user for SMTP-authentication                                                                                                                                                                                        |
| `password` | string    | empty   | n/a              | password for SMTP-authentication                                                                                                                                                                                    |
| `sender`   | string    | empty   | any UTF-8 string | Name of the sender. Example: `"\"E-Mail Service of Example.org ✉️\" <email-service@example.org>"`                                                                                                                                                                                        |

Note that the e-mail notification is turned off by default (`enabled: false`). Hence, the initial configuration always works. However, when switching on e-mail notifications make sure to configure all parameters suitably. Simply setting `enabled: true` won't cut it.

You can test you configuration using command `node emailNotificationConfigurationTest.js recipient@example.org` whereas `recipient@example.org` should be replaced by some e-mail address you have access to.

## Usage

tbd

## E-mail notification

tbd
