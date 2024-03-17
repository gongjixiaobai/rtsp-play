# 依赖
- node.js
- ffmpeg
- jsmpeg
# 测试
```shell
# 安装依赖
npm install
# 启动服务
node main.js
```
 node main.js

## html代码样例

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no,viewport-fit=cover">
  <script src="https://jsmpeg.com/jsmpeg.min.js" charset="utf-8"></script>
  <title>播放rtsp</title>
</head>
<body>
    <!-- canvas：视频播放容器 -->
    <canvas id="canvas-1" style="width: 300px;"></canvas>      
</body>
<script>
  var rtsp = 'rtsp://172.23.128.1/test1'
  var paused = false;
var player = null;

function createPlayer() {
  if (player !== null) {
    player.destroy();
    player = null;
  }

  player = new JSMpeg.Player(
    "ws://172.23.128.1:9999/rtsp?url=" + rtsp,
    {
      canvas: document.getElementById("canvas-1"),
      onPlay: function () {
        paused = false;
      },
      onPause: function () {
        paused = true;
      },
      onStop: function () {
        paused = true;
      },
    }
  );

  // 主动播放
  player.play();
}

document.addEventListener("visibilitychange", handleVisibilityChange, false);

window.addEventListener("beforeunload", function () {
  // 停止并销毁播放器实例，以确保正确的清理
  if (player !== null) {
    player.pause();
    player.destroy();
    player = null;
  }
});

function updatePlayer() {
  if (!paused && player !== null) {
    player.update(Date.now());
  }
  requestAnimationFrame(updatePlayer);
}

requestAnimationFrame(updatePlayer);

// 一进入页面就播放视频
createPlayer();
</script>
</html>

```
