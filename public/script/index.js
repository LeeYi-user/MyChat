// deno-lint-ignore-file

(async () =>
{
    function request()
    {
        return new Promise((resolve) =>
        {
            fetch("/search").then((response) =>
            {
                if (response.ok)
                {
                    resolve(response);
                }
                else
                {
                    resolve(request());
                }
            });
        });
    }

    const response = await request();
    const rooms = await response.json();

    if (rooms.length > 0)
    {
        let count = 0;

        for (const room of rooms.reverse())
        {
            count++;
            document.getElementById("custom-select").innerHTML += "<option value='" + count + "'>" + room["name"].replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</option>";
        }
    }

    document.getElementById("join").onclick = async () =>
    {
        const ele = document.getElementsByName("roomname")[0];

        if (ele.value.length === 0 || ((ele.value.indexOf(" ") > -1 || ele.value.indexOf("@") > -1) && !ele.value.startsWith("@")))
        {
            setTimeout(() => alert("Invalid room name!"), 200);
            return;
        }

        const _response = await fetch("/join",
        {
            method: "POST",
            body: new FormData(document.getElementById("form"))
        });

        location.href = "/home";
    };

    document.getElementById("sign_out").onclick = async () =>
    {
        const _response = await fetch("/sign_out");
        location.replace("/login");
    };

    var x, i, j, l, ll, selElmnt, a, b, c;

    x = document.getElementsByClassName("custom-select");
    l = x.length;

    for (i = 0; i < l; i++)
    {
        selElmnt = x[i].getElementsByTagName("select")[0];
        ll = selElmnt.length;
        a = document.createElement("DIV");
        a.setAttribute("class", "select-selected");
        a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
        x[i].appendChild(a);
        b = document.createElement("DIV");
        b.setAttribute("class", "select-items select-hide");

        for (j = 1; j < ll; j++)
        {
            c = document.createElement("DIV");
            c.innerHTML = selElmnt.options[j].innerHTML;
            c.addEventListener("click", function(e)
            {
                var y, i, k, s, h, sl, yl;

                s = this.parentNode.parentNode.getElementsByTagName("select")[0];
                sl = s.length;
                h = this.parentNode.previousSibling;

                for (i = 0; i < sl; i++)
                {
                    if (s.options[i].innerHTML == this.innerHTML)
                    {
                        s.selectedIndex = i;
                        document.getElementsByName("roomname")[0].value = this.innerHTML.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
                        y = this.parentNode.getElementsByClassName("same-as-selected");
                        yl = y.length;

                        for (k = 0; k < yl; k++)
                        {
                            y[k].removeAttribute("class");
                        }

                        this.setAttribute("class", "same-as-selected");
                        break;
                    }
                }

                h.click();
            });

            b.appendChild(c);
        }

        x[i].appendChild(b);
        a.addEventListener("click", function(e)
        {
            e.stopPropagation();
            closeAllSelect(this);
            this.nextSibling.classList.toggle("select-hide");
            this.classList.toggle("select-arrow-active");
            x[0].style.boxShadow = "0 0 0 3px DodgerBlue";
        });
    }

    function closeAllSelect(elmnt)
    {
        var x, y, i, xl, yl, arrNo = [];

        x = document.getElementsByClassName("select-items");
        y = document.getElementsByClassName("select-selected");
        xl = x.length;
        yl = y.length;

        for (i = 0; i < yl; i++)
        {
            if (elmnt == y[i])
            {
                arrNo.push(i)
            }
            else
            {
                y[i].classList.remove("select-arrow-active");
            }
        }

        for (i = 0; i < xl; i++)
        {
            if (arrNo.indexOf(i))
            {
                x[i].classList.add("select-hide");
            }
        }

        document.getElementsByClassName("custom-select")[0].style.boxShadow = "none";
    }

    document.addEventListener("click", closeAllSelect);
})();
