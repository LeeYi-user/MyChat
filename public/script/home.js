let load = false, count = 0, temp = null;
const msgs = [];

(async function main()
{
    let user = null;

    function connect()
    {
        return new Promise((resolve) =>
        {
            const prot = (location.protocol === "http:") ? "ws:" : "wss:";
            const port = (location.port === "") ? "" : (":" + location.port);
            const socket = new WebSocket(prot + "//" + location.hostname + port + "/wss");

            socket.addEventListener("open", () => resolve(socket));
            socket.addEventListener("error", () => resolve(connect()));
        });
    }

    const socket = await connect();

    socket.onmessage = (event) =>
    {
        const data = JSON.parse(event.data);

        for (const key in data)
        {
            switch (key)
            {
                case "check":
                {
                    if (user === null)
                    {
                        user = data[key];

                        if (!load)
                        {
                            socket.send(JSON.stringify({ "history": 100 }));
                        }
                        else
                        {
                            socket.send(JSON.stringify({ "history": 0 }));
                        }
                    }
                    else if (!load)
                    {
                        count = data[key];
                        load = true;
                    }
                    else if (data[key] > count)
                    {
                        socket.send(JSON.stringify({ "history": data[key] - count }));
                    }
                    else
                    {
                        while (msgs.length > 0)
                        {
                            socket.send(JSON.stringify({ "message": msgs.shift() }));
                        }
                    }

                    break;
                }
                case "message":
                {
                    const ele = document.getElementById("body");

                    if (data[key]["user"] === user)
                    {
                        ele.innerHTML += "<p class='message user'>" + data[key]["text"].replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>";
                        temp = null;
                    }
                    else
                    {
                        if (data[key]["user"] !== temp)
                        {
                            ele.innerHTML += "<p>" + data[key]["user"].replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>";
                            temp = data[key]["user"];
                        }

                        ele.innerHTML += "<p class='message'>" + data[key]["text"].replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>";
                    }

                    ele.scrollTop = ele.scrollHeight;

                    if (load)
                    {
                        count++;
                    }

                    break;
                }
            }
        }
    };

    function send(event, id)
    {
        const ele = document.getElementById("input");

        if (((event.key === "Enter" && id === "input") || id === "button" ) && ele.value.trim().length > 0 && user !== null)
        {
            if (socket.readyState === WebSocket.OPEN)
            {
                socket.send(JSON.stringify({ "message": ele.value }));
            }
            else
            {
                msgs.push(ele.value);
            }

            ele.value = "";
        }
    }

    document.getElementById("input").onkeydown = (event) => send(event, "input");
    document.getElementById("button").onclick = (event) => send(event, "button");

    const loop = setInterval(async () =>
    {
        if (socket.readyState !== WebSocket.OPEN)
        {
            clearInterval(loop);
            await main();
        }
    }, 1000);
})();
