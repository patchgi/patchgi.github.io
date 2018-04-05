const typeCommand = (command) => {
    let $command = document.querySelector(".command")
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

const outputData = (_profile) => {
    let $ul = document.querySelector(".personal_data")
    let links = ["twitter", "facebook", "github"]
    let $l1 = document.createElement("li")
    let $l2 = document.createElement("li")
    $l1.classList.add('profile')
    $l2.classList.add('profile')
    $l1.textContent = "{"
    $l2.textContent = "}"
    $ul.appendChild($l1)
    for (k in _profile) {
        outputDatum(k, _profile[k], $ul, links)
    }
    $ul.appendChild($l2)
}


window.addEventListener("DOMContentLoaded", function () {

    let $data = document.querySelector(".data")
    let profile = {
        "name": "Kosuke Yagi",
        "birthday": "1994/09/10",
        "email": "pacchigi0910@gmail.com",
        "education": "Meiji University",
        "laboratory": "Keita Watanabe",
        "twitter": 'https://twitter.com/patchgi',
        "facebook": "https://facebook.com/patchgi",
        "github": "https://github.com/patchgi",
    }

    setTimeout(typeCommand, 3500, " whois me")
    setTimeout(outputData, 5000, profile)
})