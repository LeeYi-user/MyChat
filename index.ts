import { Application, Context, Router, send } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.29.4/mod.ts";
import { Session, MongoStore } from "https://deno.land/x/oak_sessions@v4.0.5/mod.ts";
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

const client = new MongoClient();
await client.connect(Deno.env.get("URI")!);
const db = client.database("chat");

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

const clients = new Map<WebSocket, Room>();

async function wss(ctx: Context)
{
    if (!ctx.isUpgradable)
    {
        ctx.throw(501);
    }

    const socket = ctx.upgrade();
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

console.log("Server running at http://localhost:8080");
await app.listen({ port: 8080 });
