document.getElementById("sign_up").onclick = async () =>
{
    const ele = document.getElementsByName("username")[0];

    if (ele.value.length === 0 || ele.value.indexOf(" ") > -1 || ele.value.indexOf("@") > -1)
    {
        setTimeout(() => alert("Invalid username!"), 200);
        return;
    }

    const response = await fetch("/sign_up",
    {
        method: "POST",
        body: new FormData(document.getElementById("form"))
    });

    if (await response.json())
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
    const response = await fetch("/sign_in",
    {
        method: "POST",
        body: new FormData(document.getElementById("form"))
    });

    if (await response.json())
    {
        location.href = "/";
    }
    else
    {
        alert("Wrong username or password!");
    }
};
