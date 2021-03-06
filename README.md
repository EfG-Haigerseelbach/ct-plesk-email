# ChurchTools-Plesk-E-Mail Integration

Integrating a Mailbox Governance for Plesk with ChurchTools

## Reasoning

Within a church's ministries there is a natural fluctuation of employees and volunteers. There is also a good chance that some of them need a e-mail mailbox
related to the church's domain. Hence, an administrator taking care of these mailboxes has a constant work load which is only dedicated to the creation, adjustment and
deletion of mailboxes.

Within ChurchTools the person master data contains (at least one) e-mail address. In case this is a private e-mail address (and not already one in the realm of the church's domain)this integration can be used to automatically govern 'official' mailboxes for the church's domain.

![idea sketch](idea.svg)

## Installation

### Download

1. Clone this repository `git clone https://github.com/EfG-Haigerseelbach/ct-plesk-email.git`.
2. Change to directory `ct-plesk-email`.
3. Run command `npm install`.
4. Change to directory `ct-plesk-email\config`.

### Configure

5. Copy `template.json` to `default.json`.
6. Edit `default.json` according to your needs. Refer to section **Configuration**.

### Schedule

7. As normal user (not sudo!) run command `crontab -e` since querying the persons and their tags via the ChurchTools API should be run without administrator privileges.
8. A the following line `*/5 * * * * cd /path/to/ct-plesk-email/ && /usr/local/bin/node /path/to/ct-plesk-email/index.js > /path/to/ct-plesk-email/cron.log 2>&1` to query for changes at person's tags every five minutes. Help on defining a cron-pattern that suits your needs can be found at [crontab guru](https://crontab.guru/). Explanation: `*/5 * * * *` tells to execute the process every five minutes. `cd /path/to/ct-plesk-email/` changes to the directory. `&&` combines both commands. `/usr/local/bin/node` is the absolute path of `node`. `/path/to/ct-plesk-email/index.js` is the node-application to be executed. `> /path/to/ct-plesk-email/cron.log` indicates that the standard output of the `index.js` script will be redirected to file `/path/to/ct-plesk-email/cron.log`. `2>&1` indicates that the standard error (2>) is redirected to the same file descriptor that is pointed by standard output (&1). So, both standard output and error will be redirected to `cron.log`.
9. To check your user's cron jobs run command `crontab -l`.
10. To test if the cron job is executed delete file `inputDataForCronJob.js` (if existing) and wait for the job to be executed. The file should be created.
11. tbd

## Configuration

All configuration settings are located at `config/default.json`. Initially this file *does not exist*. You need to copy `config/template.json` and adjust it according to your needs. 

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
| `sender`   | string    | empty   | any UTF-8 string | Name of the sender. Example: `"\"E-Mail Service of Example.org ??????\" <email-service@example.org>"`                                                                                                                                                                                        |

Note that the e-mail notification is turned off by default (`enabled: false`). Hence, the initial configuration always works. However, when switching on e-mail notifications make sure to configure all parameters suitably. Simply setting `enabled: true` won't cut it.

You can test you configuration using command `node emailNotificationConfigurationTest.js recipient@example.org` whereas `recipient@example.org` should be replaced by some e-mail address you have access to.

## Usage

tbd

## E-mail notification

tbd
