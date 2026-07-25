import { Application, Context, Router, send } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { MongoClient, ServerApiVersion } from "npm:mongodb@6.21.0";
import type { Collection, Db } from "npm:mongodb@6.21.0";
// Imported straight from src/ instead of mod.ts: mod.ts eagerly pulls in every
// bundled store, including the one built on deno.land/x/mongo.
import Session, { type SessionData } from "https://deno.land/x/oak_sessions@v4.0.5/src/Session.ts";
import type Store from "https://deno.land/x/oak_sessions@v4.0.5/src/stores/Store.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";

interface User
{
    "username": string;
    "password": string;
}

interface Msg
{
    "room": string;
    "user": string;
    "text": string;
}

interface Room
{
    "name": string;
}

interface SessionDoc
{
    "id": string;
    "data": SessionData;
}

// oak_sessions ships a MongoStore, but it is typed against deno.land/x/mongo and
// will not take a Db from the official driver. Same document shape as the
// bundled one, so existing session documents keep working.
class MongoStore implements Store
{
    sessions: Collection<SessionDoc>;

    constructor(db: Db, collectionName = "sessions")
    {
        this.sessions = db.collection<SessionDoc>(collectionName);
    }

    async sessionExists(sessionId: string)
    {
        return await this.sessions.findOne({ "id": sessionId }) !== null;
    }

    async getSessionById(sessionId: string)
    {
        const session = await this.sessions.findOne({ "id": sessionId });

        return session ? session.data : null;
    }

    async createSession(sessionId: string, initialData: SessionData)
    {
        await this.persistSessionData(sessionId, initialData);
    }

    async persistSessionData(sessionId: string, sessionData: SessionData)
    {
        await this.sessions.replaceOne({ "id": sessionId }, { "id": sessionId, "data": sessionData }, { upsert: true });
    }

    async deleteSession(sessionId: string)
    {
        await this.sessions.deleteOne({ "id": sessionId });
    }
}

// mongodb+srv://<user>:<password>@cluster0.vxvhpav.mongodb.net/?appName=Cluster0
const uri = Deno.env.get("URI");

if (!uri)
{
    throw new Error("Missing required env var URI");
}

const client = new MongoClient(uri,
{
    serverApi:
    {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    // Deno Deploy runs many isolates and each one builds its own pool, so the
    // driver's default of 100 sockets per isolate would eat an Atlas M0's cap.
    maxPoolSize: 10,
    maxIdleTimeMS: 60000
});

// The client is shared by the whole server, so it is never closed — a ping just
// turns a bad URI or password into a crash at boot instead of a broken request.
await client.connect();
await client.db("admin").command({ ping: 1 });

console.log("Pinged your deployment. You successfully connected to MongoDB!");

const db = client.db("chat");

const router = new Router();
router.get("/favicon.ico", favicon);
router.get("/public/script/(.*)", script);
router.get("/login", login);
router.post("/sign_up", sign_up);
router.post("/sign_in", sign_in);
router.get("/", index);
router.get("/search", search);
router.post("/join", join);
router.get("/home", home);
router.get("/wss", wss);
router.get("/sign_out", sign_out);

const app = new Application();
app.use(Session.initMiddleware(new MongoStore(db, "session"), { cookieSetOptions: { expires: new Date(3000, 1, 1) } }));
app.use(router.routes());
app.use(router.allowedMethods());

async function favicon(ctx: Context)
{
    ctx.response.body = await Deno.readFile("./favicon.png");
}

async function script(ctx: Context)
{
    await send(ctx, ctx.request.url.pathname,
    {
        root: `${ Deno.cwd() }/`
    });
}

async function login(ctx: Context)
{
    ctx.response.body = await Deno.readFile("./public/login.html");
}

async function sign_up(ctx: Context)
{
    const body = ctx.request.body({ type: "form-data" });
    const data = await body.value.read();
    const accounts = await db.collection<User>("users").countDocuments({ "username": data["fields"]["username"] });

    if (accounts === 0)
    {
        await db.collection<User>("users").insertOne({ "username": data["fields"]["username"], "password": data["fields"]["password"] });
        ctx.response.body = true;
    }
    else
    {
        ctx.response.body = false;
    }
}

async function sign_in(ctx: Context)
{
    const body = ctx.request.body({ type: "form-data" });
    const data = await body.value.read();
    const accounts = await db.collection<User>("users").countDocuments({ "username": data["fields"]["username"] });

    if (accounts > 0)
    {
        const password = (await db.collection<User>("users").findOne({ "username": data["fields"]["username"] }))?.password;

        if (password === data["fields"]["password"])
        {
            await ctx.state.session.set("user", data["fields"]["username"]);
            ctx.response.body = true;
        }
        else
        {
            ctx.response.body = false;
        }
    }
    else
    {
        ctx.response.body = false;
    }
}

async function index(ctx: Context)
{
    if (ctx.state.session.get("user") === undefined)
    {
        ctx.response.redirect("/login");
    }
    else
    {
        ctx.response.body = await Deno.readFile("./public/index.html");
    }
}

async function search(ctx: Context)
{
    ctx.response.body = await db.collection<Room>("rooms").find({ name: /^[^@]/ }).sort({ "_id": -1 }).limit(100).toArray();
}

async function join(ctx: Context)
{
    const body = ctx.request.body({ type: "form-data" });
    const data = await body.value.read();
    let name = data["fields"]["roomname"];

    if (name.startsWith("@"))
    {
        const user = await ctx.state.session.get("user");
        const users = name.slice(1).replace(/\s/g, "").split("@").filter((elem, index, self) => index === self.indexOf(elem) && elem.length > 0);

        if (!users.includes(user))
        {
            users.push(user);
        }

        name = "@" + users.sort().join("@");
    }

    const rooms = await db.collection<Room>("rooms").countDocuments({ "name": name });

    if (rooms === 0)
    {
        await db.collection<Room>("rooms").insertOne({ "name": name });
    }

    await ctx.state.session.set("room", name);
    ctx.response.body = null;
}

async function home(ctx: Context)
{
    if (ctx.state.session.get("room") === undefined)
    {
        ctx.response.redirect("/");
    }
    else
    {
        ctx.response.body = await Deno.readFile("./public/home.html");
    }
}

const clients = new Map<WebSocket, string>();
const upgrades = new WeakMap<Request, Response>();

async function wss(ctx: Context)
{
    if (!ctx.isUpgradable)
    {
        ctx.throw(501);
    }

    // ctx.upgrade() hands the upgrade response to a promise that app.handle()
    // discards, so do the upgrade here and pass the response back to Deno.serve.
    const request = (ctx.request.originalRequest as unknown as { request: Request }).request;
    const { socket, response } = Deno.upgradeWebSocket(request);

    upgrades.set(request, response);
    ctx.respond = false;

    const room = await ctx.state.session.get("room");
    const user = await ctx.state.session.get("user");

    socket.onopen = () =>
    {
        clients.set(socket, room);
        socket.send(JSON.stringify({ "check": user }));
    };

    socket.onmessage = async (event) =>
    {
        const data = JSON.parse(event.data);

        for (const key in data)
        {
            switch (key)
            {
                case "history":
                {
                    if (data[key] > 0)
                    {
                        const msgs = await db.collection<Msg>("msgs").find({ "room": room }).sort({ "_id": -1 }).limit(data[key]).toArray();

                        for (const msg of msgs.reverse())
                        {
                            socket.send(JSON.stringify({ "message": msg }));
                        }
                    }

                    socket.send(JSON.stringify({ "check": await db.collection<Msg>("msgs").countDocuments({ "room": room }) }));
                    break;
                }
                case "message":
                {
                    const msg = { "room": room , "user": user, "text": data[key] };

                    await db.collection<Msg>("msgs").insertOne(msg);

                    for (const [socket, room_] of clients)
                    {
                        if (room_ === room)
                        {
                            socket.send(JSON.stringify({ "message": msg }));
                        }
                    }

                    break;
                }
            }
        }
    };

    socket.onclose = () =>
    {
        clients.delete(socket);
    };
}

async function sign_out(ctx: Context)
{
    await ctx.state.session.deleteSession();
    ctx.response.body = null;
}

const port = Number(Deno.env.get("PORT") ?? 8000);

console.log(`Server running at http://localhost:${ port }`);

// Deno Deploy only detects servers started with Deno.serve(), so drive oak
// through app.handle() instead of app.listen() (which uses Deno.serveHttp).
Deno.serve({ port, hostname: "0.0.0.0" }, async (request) =>
{
    const response = await app.handle(request);

    return upgrades.get(request) ?? response ?? new Response(null, { status: 404 });
});
