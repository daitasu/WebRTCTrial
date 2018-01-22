const localVideo = document.getElementById('local_video');
const remoteVideo = document.getElementById('remote_video');
const textForSendSdp = document.getElementById('text_for_send_sdp');
const textToReceiveSdp = document.getElementById('text_for_receive_sdp');
let localStream = null;
let peerConnection = null;

/*
 * ローカルメディアへのアクセス
 */
function startVideo() {
    navigator.mediaDevices.getUserMedia({video: true, audio: true //})
    // navigator.mediaDevices.getUserMedia({
    //     audio: true,
    //     video: { width: 640, height: 480 }
    // })
    // navigator.mediaDevices.getUserMedia({
    //     audio: true,
    //     video: { frameRate: { min: 10, max: 15 } }
     }).then((stream) => { // success
        playVideo(localVideo,stream);
        localStream = stream;

    }).catch((error) => { // error
        console.error('mediaDevice.getUserMedia() error:', error);
        return;
    });
}

// Videoの再生を開始する
function playVideo(element, stream) {
    element.srcObject = stream;
    element.play();
}

/*
 * peerの準備・ベンダー対応・イベントの準備
 */

// WebRTCを利用する準備をする
function prepareNewConnection() {
    // RTCPeerConnectionを初期化する
    const pc_config = {"iceServers":[ {"urls":"stun:stun.skyway.io:3478"} ]};
    const peer = new RTCPeerConnection(pc_config);

    // リモートのストリームを受信した場合のイベントをセット
    if ('ontrack' in peer) {
        //Safari, firefox向け
        peer.ontrack = function(event) {
            console.log('-- peer.ontrack()');
            playVideo(remoteVideo, event.streams[0]);
        };
    }
    else {
        //Chrome向け
        peer.onaddstream = function(event) {
            console.log('-- peer.onaddstream()');
            playVideo(remoteVideo, event.stream);
        };
    }

    // ICE Candidateを収集したときのイベント(Vanilla ICE・Trickle ICE)
    peer.onicecandidate = function (evt) {
        if (evt.candidate) {
            console.log(evt.candidate);
        } else {
            console.log('empty ice event');
            sendSdp(peer.localDescription);
        }
    };

    // ローカルのストリームを利用できるように準備する
    if (localStream) {
        console.log('Adding local stream...');
        peer.addStream(localStream);
    }
    else {
        console.warn('no local stream, but continue.');
    }

    return peer;
}

// シグナリングで交換する情報をテキストエリアに表示する
function sendSdp(sessionDescription) {
    console.log('---sending sdp ---');
    textForSendSdp.value = sessionDescription.sdp;
    textForSendSdp.focus();
    textForSendSdp.select();
}

/*
 * Connect処理(SDPの生成・登録)
 */

// Connectボタンが押されたら処理を開始
function connect() {
    if (! peerConnection) {
        console.log('make Offer');
        makeOffer();
    }
    else {
        console.warn('peer already exist.');
    }
}

// Offer SDPを生成する
function makeOffer() {
    peerConnection = prepareNewConnection();
    peerConnection.onnegotiationneeded = function(){
        //createOffer()でSDP（ブラウザが利用可能なWebRTCの通信に必要な各種情報）が生成
        peerConnection.createOffer()
            .then(function (sessionDescription) {
                console.log('createOffer() succsess in promise');
                //setLocalDescription()で生成されたSDPをセット
                return peerConnection.setLocalDescription(sessionDescription);
            }).then(function() {
                //完了後、非同期でpeer.onicecandidateイベントが走るようになる
                console.log('setLocalDescription() succsess in promise');
        }).catch(function(err) {
            console.error(err);
        });
    }
}


// Answer SDPを生成する
function makeAnswer() {
    console.log('sending Answer. Creating remote session description...' );
    if (! peerConnection) {
        console.error('peerConnection NOT exist!');
        return;
    }
    peerConnection.createAnswer()
        .then(function (sessionDescription) {
            console.log('createAnswer() succsess in promise');
            return peerConnection.setLocalDescription(sessionDescription);
        }).then(function() {
        console.log('setLocalDescription() succsess in promise');
    }).catch(function(err) {
        console.error(err);
    });
}


/*
 * SDPをセットする
 */

// SDPのタイプを判別しセットする
function onSdpText() {
    const text = textToReceiveSdp.value;
    if (peerConnection) {
        // Offerした側が相手からのAnswerをセットする場合
        console.log('Received answer text...');
        const answer = new RTCSessionDescription({
            type : 'answer',
            sdp : text,
        });
        setAnswer(answer);
    }
    else {
        // Offerを受けた側が相手からのOfferをセットする場合
        console.log('Received offer text...');
        const offer = new RTCSessionDescription({
            type : 'offer',
            sdp : text,
        });
        setOffer(offer);
    }
    textToReceiveSdp.value ='';
}

// Offer側のSDPをセットした場合の処理
function setOffer(sessionDescription) {
    if (peerConnection) {
        console.error('peerConnection alreay exist!');
    }
    peerConnection = prepareNewConnection();
    peerConnection.onnegotiationneeded = function () {
        peerConnection.setRemoteDescription(sessionDescription)
            .then(function() {
                console.log('setRemoteDescription(offer) succsess in promise');
                makeAnswer();
            }).catch(function(err) {
            console.error('setRemoteDescription(offer) ERROR: ', err);
        });
    }
}

// Answer側のSDPをセットした場合の処理
function setAnswer(sessionDescription) {
    if (! peerConnection) {
        console.error('peerConnection NOT exist!');
        return;
    }
    peerConnection.setRemoteDescription(sessionDescription)
        .then(function() {
            console.log('setRemoteDescription(answer) succsess in promise');
        }).catch(function(err) {
        console.error('setRemoteDescription(answer) ERROR: ', err);
    });
}

/*
 * peerの切断
 */

// WebRTCを利用する準備をする
// function prepareNewConnection() {
//     // ICEのステータスが変更になったときの処理
//     peer.oniceconnectionstatechange = function() {
//         console.log('ICE connection Status has changed to ' + peer.iceConnectionState);
//         switch (peer.iceConnectionState) {
//             case 'closed':
//             case 'failed':
//                 // ICEのステートが切断状態または異常状態になったら切断処理を実行する
//                 if (peerConnection) {
//                     hangUp();
//                 }
//                 break;
//             case 'dissconnected':
//                 break;
//         }
//     };
// }
//
// // P2P通信を切断する
// function hangUp(){
//     if (peerConnection) {
//         if(peerConnection.iceConnectionState !== 'closed'){
//             peerConnection.close();
//             peerConnection = null;
//             cleanupVideoElement(remoteVideo);
//             textForSendSdp.value = '';
//             return;
//         }
//     }
//     console.log('peerConnection is closed.');
//
// }
//
//
// // ビデオエレメントを初期化する
// function cleanupVideoElement(element) {
//     element.pause();
//     element.srcObject = null;
// }