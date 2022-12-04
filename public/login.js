const port = (location.port === "") ? "" : (":" + location.port);

document.getElementById("sign_up").onclick = async () =>
{
    if (document.getElementsByName("username")[0].value === "")
    {
        setTimeout(() => alert("Invalid username!"), 400);
        return;
    }

    const request = await fetch(location.protocol + "//" + location.hostname + port + "/sign_up",
    {
        method: "POST",
        body: new FormData(document.getElementById("form"))
    });

    const responseText = await request.text();

    if (responseText === "sign up fail")
    {
        alert("This username already exists!");
    }
    else if (responseText === "sign up success")
    {
        alert("Sign up successfully!");
    }
};

document.getElementById("sign_in").onclick = async () =>
{
    const request = await fetch(location.protocol + "//" + location.hostname + port + "/sign_in",
    {
        method: "POST",
        body: new FormData(document.getElementById("form"))
    });

    const responseText = await request.text();

    if (responseText === "sign in fail")
    {
        alert("Wrong username or password!");
    }
    else if (responseText === "sign in success")
    {
        location.replace("/public/home.html");
    }
};
