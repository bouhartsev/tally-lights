document.addEventListener("DOMContentLoaded", function () {
  const checkLnk = (u, s) => {
    return (
      u.lastIndexOf(s) == u.length - s.length ||
      u.lastIndexOf(s) == u.length - s.length - 1
    );
  };
  const getProjLink = () => {
    link_proj_root = location.href;
    if (checkLnk(link_proj_root, "/settings"))
      link_proj_root = link_proj_root.slice(0, link_proj_root.length - 9);
    if (!checkLnk(link_proj_root, "/")) link_proj_root += "/";
    return link_proj_root;
  };
  const setDirLink = () => {
    document.querySelector(".director-links").innerHTML =
      "Director - " +
      '<a href="' +
      link_director +
      '" target="_blank" rel="noopener noreferrer">' +
      link_director +
      "</a>";
  };

  const cameras = document.querySelector(".nums_input");
  let cams = 0,
    title_old = "";
  let link_proj_root = "",
    link_director = "", link_cam_root;

  getProjLink();
  link_director = link_proj_root + "director";
  setDirLink();
  link_cam_root = link_proj_root + "camera/";

  const air = document.querySelector("#air");
  air.addEventListener("click", (e)=>{
    // do you really want?

    const live_checked = !(e.target.getAttribute('aria-checked') === 'true');
    send("live", live_checked);
  })

  const settings_form = document.querySelector("#settings_form");
  let cams_list = [];
  const saveSettings = function (e) {
    let toSend = {};
    if (title != title_old) toSend["title"] = title;

    let cams_temp = parseInt(cameras.value);
    if ((cams_temp || cams_temp === 0) && cams_temp != cams) {
      if (cams_temp >= 0 && cams_temp <= 255) toSend["quantity"] = cams_temp;
    }

    if (Object.keys(toSend).length) send(toSend);
  };
  settings_form.addEventListener("submit", saveSettings);

  const copyToClipboard = function (e) {
    // add some notification !!!
    navigator.clipboard.writeText(e.target.parentElement.innerText); //.replace(/<\/?[a-zA-Z]+>/gi, ""));
    console.log("Copied!");
  };
  document
    .querySelectorAll(".clipboard")
    .forEach((button_copy) =>
      button_copy.addEventListener("click", copyToClipboard)
    );

  addition = document.querySelector(".status");
  const error = document.querySelector(".error");
  const cameras_crew_links = document.querySelector(".cameras_crew-links");
  setData = function (key, value) {
    // if (error.innerText) error.innerText = ""; // how to remove error ???
    switch (key) {
      case "title":
        if (title_old != value) title = title_old = project_name.value = value;
        break;
      case "quantity":
        cams = parseInt(value);
        cameras.value = value;
        if (cams_list.length != value) {
          if (cams_list.length > value)
            cams_list.splice(value, cams_list.length - value);
          else if (cams_list.length < value) {
            let newCam = null;
            while (cams_list.length != value) {
              newCam = document.createElement("li");
              newCam.id = cams_list.length + 1;
              newCam.innerHTML =
                "Camera " +
                newCam.id +
                " - " +
                '<a href="' +
                link_cam_root+newCam.id +
                '" target="_blank" rel="noopener noreferrer">' +
                link_cam_root+newCam.id +
                "</a>";
              cams_list.push(newCam);
            }
          }
          cameras_crew_links.replaceChildren(...cams_list);
        }
        break;
      case "wrong":
        error.innerText = value;
        break;
      case "offline":
        console.log("offline");
        error.innerText = "Saving error. You are offline!";
        break;
      case "live":
        if (value) {
          let temp_date = new Date();
          let temp_minutes = parseInt(value/60);
          temp_date.setUTCHours(parseInt(temp_minutes/60)%24);
          temp_date.setUTCMinutes(temp_minutes%60);
          air.setAttribute('data-finish', temp_date.toLocaleTimeString().slice(0,-3));
        }
        air.setAttribute('aria-checked', String(!!value));
        break;
      default:
        console.log(key, value);
        break;
    }
  };
});
