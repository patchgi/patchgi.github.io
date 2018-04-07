

const typeCommand = (command, $command) => {
    let command_length = command.length
    let idx = 0
    let type = function () {
        $command.textContent += command[idx++]
        if (idx == command_length) return
        setTimeout(type, 150)
    }
    type()
}
const outputDatum = (_k, _v, _$ul, _links) => {
    let data = `"${_k}": "${_v}",`
    let $li = document.createElement("li")
    $li.classList.add('profile')
    if (_links.indexOf(_k) != -1) {
        let $div = document.createElement("div")
        let $a = document.createElement("a")
        $a.href = _v
        $div.textContent = `"${_k}": `
        $a.textContent = `"${_v}",`
        $div.appendChild($a)
        $li.appendChild($div)
    }
    else {
        let node = document.createTextNode(data)
        $li.appendChild(node)
    }
    _$ul.appendChild($li)
}

const outputData = (_profile, $ul, _class, f) => {
    let links = ["twitter", "facebook", "github"]
    let $l1 = document.createElement("li")
    let $l2 = document.createElement("li")
    $l1.classList.add(_class)
    $l2.classList.add(_class)
    $l1.textContent = "{"
    $l2.textContent = "}"
    $ul.appendChild($l1)
    for (k in _profile) {
        outputDatum(k, _profile[k], $ul, links)
    }
    f()
    $ul.appendChild($l2)

}
let displayProfile = ($dom) => {
    return new Promise((resolve, reject) => {
        setTimeout(typeCommand, 500, " whois me", $dom)
        resolve(true)
    })
}

window.addEventListener("DOMContentLoaded", function () {

    let $data = document.querySelector(".data")
    let $who = document.querySelector(".command")
    let $projects = document.querySelector(".pro")
    let $career = document.querySelector(".career")
    let $career_ul = document.querySelector(".careers")
    let $ul = document.querySelector(".personal_data")
    let scroll = 0;
    let con_scroll = 0;
    let mobile = false
    let profile = {
        "name": "Kosuke Yagi",
        "birthday": "1994/09/10",
        "email": "pacchigi0910@gmail.com",
        "education": "Meiji University",
        "location": "Nakano Tokyo Japan",
        "laboratory": "Keita Watanabe",
        "research": "Human Computer Interaction",
        "twitter": 'https://twitter.com/patchgi',
        "facebook": "https://facebook.com/patchgi",
        "github": "https://github.com/patchgi",
    }
    let career = {
        "株式会社Appbank": "Webエンジニア(PHP, Ruby on Rails, Javascript)",
        "株式会社Life is Tech": "メンター(Ruby on Rails, Javascript, OpenFrameWorks)"
    }
    let ua = navigator.userAgent
    if (ua.indexOf("iPhone") > 0 || ua.indexOf("Android") > 0 || ua.indexOf("iPad") > 0) {
        mobile = true
        let $youtube = document.querySelector(".movie")
        $youtube.style = "display:none;"
        let $background = document.createElement("img")
        $background.src = "image/ex.jpg"
        $background.setAttribute("class", "mobile")
        document.querySelector(".player").insertBefore($background, $youtube)

    }
    let outputProjects = () => {
        document.querySelector(".projects").style = "display:flex;"
        document.querySelector(".career").style = "display: inline;"
    }
    let outputCareer = () => {
        let c = document.querySelectorAll(".c")
        for (let idx = 0; idx < c.length; idx++) {
            c[idx].style = "display: block;"
        }
    }
    displayProfile($who)
        .then((f) => {
            if (f) {
                setTimeout(outputData, 2500, profile, $ul, "profile", () => {
                    document.querySelector(".pro").style = "display: inline;"
                })
            }
        })
        .then(setTimeout(typeCommand, 3500, " ls projects/", $projects))
        .then(setTimeout(outputProjects, 5500))
        .then(setTimeout(typeCommand, 7000, " ls career/", $career))
        .then(setTimeout(outputCareer, 9000))

})