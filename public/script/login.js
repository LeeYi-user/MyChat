document.getElementById("sign_up").onclick = async () =>
{
    const ele = document.getElementsByName("username")[0];

    if (ele.value.length === 0 || ele.value.indexOf(" ") > -1)
    {
        setTimeout(() => alert("Invalid username!"), 400);
        return;
    }

    const request = await fetch("/sign_up",
    {
        method: "POST",
        body: new FormData(document.getElementById("form"))
    });

    if (await request.text() === "true")
    {
        alert("Sign up successfully!");
    }
    else
    {
        alert("This username already exists!");
    }
};

document.getElementById("sign_in").onclick = async () =>
{
    const request = await fetch("/sign_in",
    {
        method: "POST",
        body: new FormData(document.getElementById("form"))
    });

    if (await request.text() === "true")
    {
        location.replace("/");
    }
    else
    {
        alert("Wrong username or password!");
    }
};
