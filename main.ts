import websocket from 'ws';
import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import {Writable} from "node:stream";

const app = express();
const port = 3000;
const rtspUrlFfmpegMap: Map<string, any> = new Map();
const rtspUrlWsMap: Map<string, any> = new Map();


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log('Example app listening at http://localhost:' + port);
});


const ws = new websocket.Server({port: 9999, path: '/rtsp'});

ws.on('connection', (ws, request) => {
    // @ts-ignore
    // 设置id
    ws.id = Date.now();
    // 获取参数url
    const urlParams = new URLSearchParams(request.url?.split('?')[1]);
    const rtspUrl: any = urlParams.get('url');
    getWebSocketData(ws, rtspUrl);

    ws.on('message', (message) => {
        console.log('received: %s', message);
    });

    ws.on('close', () => {
        // @ts-ignore
        const id = ws.id;
        // 遍历rtspUrlWsMap，删除ws
        for (let [key, value] of rtspUrlWsMap) {
            // 遍历value, id相等则删除
            let wsToDelete = [];
            for (let ws of value) {
                // @ts-ignore
                if (ws.id === id) {
                    wsToDelete.push(ws);
                }
            }
            for (let ws of wsToDelete) {
                value.delete(ws);
            }

            // 如果value为空，则删除rtspUrlWsMap中的key
            if (value.size === 0) {
                rtspUrlWsMap.delete(key);
                // 从rtspUrlFfmpegMap中删除, 并停止转流
                let ffmpegCommand = rtspUrlFfmpegMap.get(key);
                if (ffmpegCommand) {
                    // 结束转流
                    ffmpegCommand.end();
                }
                rtspUrlFfmpegMap.delete(key);
            }
        }
    });
});

const getWebSocketData = (ws: websocket, rtspUrl: string) => {
    // 共用一个转流，先查看是否已存在此转流，不存在则创建
    // 生成id
    // @ts-ignore
    ws.id = Date.now();
    if (rtspUrlFfmpegMap.has(rtspUrl)) {
        rtspUrlWsMap.get(rtspUrl).add(ws);
    } else {
        // @ts-ignore
        rtspUrlWsMap.set(rtspUrl, new Set([ws]));
        rtspUrlFfmpegMap.set(rtspUrl, createFfmpeg(rtspUrl));
    }
}


const createFfmpeg = (rtspUrl: string) => {
    const wsSet = rtspUrlWsMap.get(rtspUrl);
    return ffmpeg(rtspUrl)
        .outputOptions([
            '-f mpegts',
            '-codec:v mpeg1video',
            '-s 1920x1440',
            '-b:v 800k',
            '-bf 0'
        ])
        .on('start', function (commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message);
        })
        // websocket 转 writeAbleBase
        .pipe(new Writable({
                write(chunk, encoding, callback) {
                    sendToAllWs(wsSet, chunk)
                        .then(() => {
                            callback();
                        })
                        .catch((error) => {
                            console.error('Error sending data to WebSocket:', error);
                            callback(error);
                        });
                },
            }),
            {end: true}
        );
}

const sendToAllWs = (wsSet: WebSocket[], chunk: any) => {
    const promises: Promise<void>[] = [];

    wsSet.forEach((ws: WebSocket) => {
        promises.push(new Promise((resolve, reject) => {
            try {
                // @ts-ignore
                ws.send(chunk,{binary: true}, resolve);
            } catch (error) {
                reject(error);
            }
        }));
    });

    return Promise.allSettled(promises).then(results => {
        const errors = results.filter(result => result.status === 'rejected');
        if (errors.length > 0) {
            throw new Error('Some WebSocket connections failed to send the data.');
        }
    });
};

