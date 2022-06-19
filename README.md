
# NIU CLOUD API
Node.js web API to display NIU e-scooter cloud data.  
NIU Cloud access made by: [@BlueAndi](https://github.com/BlueAndi/niu-cloud-connector)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://choosealicense.com/licenses/mit/)
[![Repo Status](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

## Instalation

Install & run project using npm.

```bash
  cd my-project
  npm install
  npm start
```
    
## Environment 

In order to run the project, full fill all variables inside `.env` file. If you don't have an account on NIU Cloud, install the app and setup an account and vehicle.

```bash
  API_ACCOUNT = email@example.com
  API_PWD = *******
  API_COUNTRY_CODE = 351
  API_KEY = i-am-a-special-key-string
  PORT = 3000
```


## Documentation

To access general vehicle data go to:

```http
  GET /api/
```

| Argument    | Type       | Description                         |
| :---------- | :--------- | :---------------------------------- |
| `key`   | `string`   | SHA256 API Key |

In order to authenticate the request, copy the sha256 code logged in the console and use it as a body request.


