// deno-lint-ignore-file

function popup(msg)
{
    const ele = document.getElementById("popup");

    ele.innerHTML = msg;
    ele.className = "show";

    setTimeout(() =>
    {
        ele.className = ele.className.replace("show", "");
    }, 3000);
}
