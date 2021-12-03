var redis = require("redis");

class Redis {
  host: string;
  port: string;
  connected: boolean;
  client: any;

  constructor() {
    this.host = process.env.REDIS_HOST || "localhost";
    this.port = process.env.REDIS_PORT || "6379";
    this.connected = false;
    this.client = null;
  }

  async set(name: string, object: any) {
    return this.client.set(name, JSON.stringify(object));
  }

  async get(name: string) {
    return JSON.parse(await this.client.get(name));
  }

  initialiseConnection() {
    if (this.connected) return this.client;
    else {
      this.client = redis.createClient({
        host: this.host,
        port: this.port,
      });
      this.client.connect();
      this.client.set("games", JSON.stringify([]));
      this.client.set("players", JSON.stringify([]));
      return this.client;
    }
  }
}

// This will be a singleton class. After first connection npm will cache this object for whole runtime.
// Every time you will call this getConnection() you will get the same connection back
export = new Redis();
