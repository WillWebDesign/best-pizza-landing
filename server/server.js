const jsonServer = require('json-server');
const https = require('https');
const crypto = require('crypto');

let db;

async function createServer() {
  db = await getDbJson();

  const server = jsonServer.create();
  const router = jsonServer.router(db);
  const middlewares = jsonServer.defaults();

  server.use(middlewares);

  server.use('/users', (req, res, next) => {
    res.sendStatus(401);
  });
  server.use('/stores', (req, res, next) => {

    if (isAuthorized(req)) {
      next();
    } else {
      res.sendStatus(401);
    }
  });

  server.use(jsonServer.bodyParser);
  server.use('/login', (req, res) => {
    if (req.method === 'POST') {
      if (!req.body.user || !req.body.password) {
        res.sendStatus(400);
        return;
      }

      const result = db.users.find(user => {
        return (
          user.email === req.body.user && user.password === req.body.password
        );
      });

      if (!result) {
        res.sendStatus(401);
        return;
      }

      var current_date = new Date().valueOf().toString();
      var random = Math.random().toString();

      const token = crypto
        .createHash('sha1')
        .update(current_date + random)
        .digest('hex');

      result.token = token;

      res.jsonp({ token });
    } else {
      res.sendStatus(404);
    }
  });

  server.use(router);
  server.listen(3000, () => {
    console.log('JSON Server is running');
  });
}

async function getDbJson() {
  const urlDb =
    'https://pruebas-muy-candidatos.s3.us-east-2.amazonaws.com/RH.json';

  return new Promise((resolve, reject) => {
    https
      .get(urlDb, res => {
        res.setEncoding('utf8');
        res.on('data', body => {
          const data = JSON.parse(body).response;
          resolve(data);
        });
      })
      .on('error', () => {
        resolve({});
      })
      .end();
  });
}

function isAuthorized(req) {

  if (!req.headers.authorization) {
    return false;
  }

  const result = db.users.find(user => {
    return user.token === req.headers.authorization;
  });

  if (!result) {
    return false;
  }

  return true;
}

createServer();
