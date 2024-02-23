import dns2 from 'dns2';
const { TCPClient, Packet, createServer } = dns2;
import Keyv from 'keyv';
import { toMAC } from '@network-utils/arp-lookup';
import path from 'path';
const __dirname = path.resolve();

import express from 'express';
const webserver = express();

const visited = new Keyv('sqlite://database.sqlite', { namespace: 'visited' });
const blocked_websites_db = new Keyv('sqlite://database.sqlite', { namespace: 'blocked_websites' });
const blocked_clients = new Keyv('sqlite://database.sqlite', { namespace: 'blocked_clients' });

let blocked_websites_list = [];

(async () => {
    blocked_websites_list = (await blocked_websites_db.get('websites'))
})();

webserver.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

const resolve = TCPClient({
    dns: '1.1.1.1'
});

const dnsserver = createServer({
    udp: true,
    handle: async (request, send, rinfo) => {
        console.log(await toMAC(rinfo.address))
        const response = Packet.createResponseFromRequest(request);
        for (const question of request.questions) {
            const res = await resolve('google.com');
            for (const answer of res.answers) {
                response.answers.push({
                    name: question.name,
                    type: Packet.TYPE.A,
                    class: Packet.CLASS.IN,
                    ttl: 1,
                    address: answer.address
                });
            }
        }
        send(response);
    }
});

dnsserver.on('request', async (request, response, rinfo) => {
    for (const question of request.questions) {
        if (!await visited.get(question.name)) {
            await visited.set(question.name, [])
        } else {
            const old = (await visited.get(question.name))
            await visited.set(question.name, [...old, Date.now()])
        }
    }
});

dnsserver.on('requestError', (error) => {
    console.log('Client sent an invalid request', error);
});

dnsserver.on('listening', () => {
    console.log(dnsserver.addresses());
});

dnsserver.on('close', () => {
    console.log('dnsserver closed');
});

dnsserver.listen({
    // Optionally specify port, address and/or the family of socket() for udp server:
    udp: {
        port: 53,
        address: "0.0.0.0",
        type: "udp4",  // IPv4 or IPv6 (Must be either "udp4" or "udp6")
    },

    // Optionally specify port and/or address for tcp server:
    tcp: {
        port: 53,
        address: "0.0.0.0",
    },
});

webserver.listen(3000, () => {
    console.log("server started on port 5000");
});