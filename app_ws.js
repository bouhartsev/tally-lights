const projects = require("./models/projects.js");
const autofinish_hours = process.env.AUTOFINISH
  ? patseFloat(process.env.AUTOFINISH)
  : 3;

module.exports = async function (server) {
  const { v4 } = require("uuid");
  const uuid = v4;

  // const { Server } = require('ws');
  // const wss = new Server({ server });
  const wss = require("socket.io")(server);

  // var clients = {};

  function send(client, message) {
    if (typeof message == "string") message = { status: message };
    client.send(JSON.stringify(message));
  }

  await projects.checkLoading; // launch server only after DB connection

  // wss.on('connection', function (ws, req) {
  wss.on("connection", function (socket) {
    // ws.id = uuid();
    const ws = socket;
    const req = {
      url: socket.handshake.headers.referer.split(
        socket.handshake.headers.host
      )[1],
    }; // FIX IT

    // works with not bare url (not only domain name). It's no exceptions.

    let url_arr = req.url.split("/").filter((val) => val); // all url's peaces without empty (first)
    let id = url_arr[0];

    console.log("New WS connection: " + id);
    socket.on("disconnecting", (reason) => {
      console.log("Close WS connetion: " + id + ", " + number);
    });

    // check id // TEMPORARY
    // if (!(id in clients))
    //   current_proj = {
    //     settings: [],
    //     directors: [],
    //     cameras: {},
    //     quantity: 0,
    //     preview: null,
    //     onair: null,
    //   };
    let number = -3; // -3 - not exists, -2 - settings, -1 - director, >0 - number of camera, 0 - reserved for camera used

    current_proj = projects.get(id);
    if (current_proj == null) {
      ws.disconnect();
      return;
    }

    if (url_arr.length == 1 || url_arr[1] == "director") {
      number = -1;
    }
    // or empty in future
    else if (url_arr[1] == "settings") {
      number = -2;
    }
    // cameras
    else if (url_arr.length > 1) {
      num = parseInt(url_arr[1]);
      if (Number.isInteger(num)) {
        if (num > 0 && num <= current_proj["quantity"]) {
          number = num;
        }
      }
    }

    // add settings
    if (number == -2) {
      current_proj["settings"].push(ws);
      send(ws, {
        title: id,
        quantity: current_proj["quantity"],
        live: current_proj["live"],
      });
    }
    // add director
    else if (number == -1) {
      current_proj["directors"].push(ws);
      send(ws, {
        quantity: current_proj["quantity"],
        preview: current_proj["preview"],
        onair: current_proj["onair"],
      });
      for (let key in current_proj["cameras"]) {
        if (current_proj["cameras"][key].length) send(ws, { connected: key });
      }
    }
    // add camera
    else if (number > 0) {
      if (!(number in current_proj["cameras"])) {
        current_proj["cameras"][number] = [];
      }
      // send message to directors
      for (
        let i = 0;
        i < current_proj["directors"].length &&
        !current_proj["cameras"][number].length;
        i++
      ) {
        send(current_proj["directors"][i], { connected: number });
      }
      current_proj["cameras"][number].push(ws);
      if (number == current_proj["onair"]) send(ws, "onair");
      if (number == current_proj["preview"]) send(ws, "preview");
    } else {
      // send - ?
      // ws.close(4000, 'not exist');
      socket.disconnect();
      return;
    }

    // if not live
    if (number != -2 && !projects.checkLive(id)) {
      socket.disconnect();
    }

    function broadcastSend() {
      for (let i = 0; i < current_proj["settings"].length; i++) {
        send(current_proj["settings"][i], { live: current_proj["live"] });
      }
    }
    function broadcastOn() {
      current_proj["live"] = parseInt(
        ((Date.now() + autofinish_hours * 3600000) / 1000) % (60 * 60 * 24)
      );
      if (current_proj["live_timer"]) clearTimeout(current_proj["live_timer"]);
      current_proj["live_timer"] = setTimeout(broadcastOff, 1000 * 3 * 60 * 60);
      broadcastSend();
    }
    function broadcastOff() {
      Object.keys(current_proj["cameras"]).forEach((cam_key) => {
        current_proj["cameras"][cam_key].forEach((el) => {
          el.disconnect();
        });
      });
      current_proj["directors"].forEach((el) => {
        el.disconnect();
      });
      current_proj["live"] = null;
      if (current_proj["live_timer"]) clearTimeout(current_proj["live_timer"]);
      current_proj["live_timer"] = null;
      broadcastSend();
    }

    ws.on("message", function (message) {
      console.log(`Message for "${id}" ` + message);
      message = JSON.parse(message);

      if (message.hasOwnProperty("live")) {
        if (message["live"] === true) broadcastOn();
        else broadcastOff();
        delete message["live"];
      } else if (current_proj["live"]) broadcastOn();

      let has_title = "title" in message;

      // удалять камеры при изменении количества на сайте, удалять данные из preview и onair, отсоединять людей
      for (let key in message) {
        let value = message[key];

        // Нужно ли проверять ключ и значение, а также на null - ?

        if (key != "title") {
          if (!has_title) {
            // add sound
            if (key == "quantity") {
              if (value < current_proj[key]) {
                Object.keys(current_proj["cameras"])
                  .filter((item) => item > value)
                  .forEach((cam_key) => {
                    current_proj["cameras"][cam_key].forEach((el) => {
                      // el.close(4000, "not exist");
                      el.disconnect();
                    });
                  });
                if (current_proj["preview"] > value)
                  current_proj["preview"] = null;
                if (current_proj["onair"] > value) current_proj["onair"] = null;
              }
              for (let i = 0; i < current_proj["settings"].length; i++) {
                send(current_proj["settings"][i], { quantity: value });
              }
            } else {
              if (value in current_proj["cameras"]) {
                for (
                  let i = 0;
                  i < current_proj["cameras"][value].length;
                  i++
                ) {
                  send(current_proj["cameras"][value][i], key);
                }
              }
              if (
                ((key == "preview" &&
                  current_proj["onair"] != current_proj[key]) ||
                  key == "onair") &&
                current_proj[key] != null &&
                current_proj[key] in current_proj["cameras"]
              ) {
                for (
                  let i = 0;
                  i < current_proj["cameras"][current_proj[key]].length;
                  i++
                ) {
                  send(
                    current_proj["cameras"][current_proj[key]][i],
                    "connected"
                  );
                }
              }
            }
          }
          current_proj[key] = value;
        }
      }

      if (Object.keys(message).length) {
        for (let i = 0; i < current_proj["directors"].length; i++)
          send(current_proj["directors"][i], message);
        if (!has_title) projects.save(id, Object.keys(message));
      }

      if ("title" in message) {
        let value = message["title"];
        let res = projects.create(
          value,
          current_proj["quantity"],
          current_proj
        );
        if (res != "Complete") send(ws, { wrong: res });
        else {
          // послать всем участникам информацию об изменении названия
          for (let i = 0; i < current_proj["settings"].length; i++) {
            send(current_proj["settings"][i], { change_title: value });
          }
          for (let i = 0; i < current_proj["directors"].length; i++) {
            send(current_proj["directors"][i], { change_title: value });
          }
          for (let camera_number in current_proj["cameras"]) {
            for (
              let i = 0;
              i < current_proj["cameras"][camera_number].length;
              i++
            ) {
              send(current_proj["cameras"][camera_number][i], {
                change_title: value,
              });
            }
          }
          projects.remove(id);
          // id = value; // ????
          current_proj = projects.get(value);
        }
      }
    });

    // ws.on('close', function (code) {
    ws.on("disconnect", function (reason) {
      if (number == -1)
        // current_proj['directors'] = current_proj['directors'].filter(item => JSON.stringify(item)!=JSON.stringify(ws));
        current_proj["directors"] = current_proj["directors"].filter(
          (item) => item.id != ws.id
        );
      else if (number > 0) {
        current_proj["cameras"][number] = current_proj["cameras"][
          number
        ]?.filter((item) => item.id != ws.id);
        if (!current_proj["cameras"][number]?.length) {
          // send message to directors
          for (
            let i = 0;
            i < current_proj["directors"].length &&
            reason != "server namespace disconnect";
            i++
          ) {
            //code!=4000
            send(current_proj["directors"][i], { disconnected: number });
          }
          delete current_proj["cameras"][number];
        }
      }
    });
  });

  return wss;
};
