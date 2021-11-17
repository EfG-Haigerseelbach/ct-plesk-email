# ChurchTools-Plesk-E-Mail Integration

## E-mail notification

The following options are available for configuration of the e-mail notification.

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
