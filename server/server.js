const { redisHost, redisPort, pgPort, pgHost, pgUser, pgPassword, pgDatabase} = require('./env_vars');
const redis = require('redis');
const { Pool } = require('pg');

// express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// allow react app on one domain to communicate with express app on another server
app.use(cors());
app.use(bodyParser.json())

// postgres client setup
const pgClient = new Pool({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPassword,
    database: pgDatabase
});
pgClient.on('error', () => console.log('Lost postgres connection'));

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT);')
    .catch(err => console.log(err));

// redis client setup
const redisClient = redis.createClient({
    host: redisHost,
    port: redisPort,
    retry_strategy: () => 1000
});
const redisPub = redisClient.duplicate();

// express route handlers
app.get('/', (req, res) => {
    res.send('root route');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values;');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) < 40) return res.status(422).send('Too large index');

    // HSET key field value
    redisClient.hset('values', index, 'Nothing yet');
    redisPub.publish('insert', index);

    pgClient.query('INSERT INTO values(number) VALUES($1);', [index]);

    res.send({working: true})
});

app.listen(5000, err => {
    console.log('listening on p5000');
});