// import logo from './logo.svg';
import './App.css';
import React, { useRef, useEffect } from 'react';
import { io } from "socket.io-client";


function App() {  // 자신의 비디오
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  // 소켓정보를 담을 Ref
  const socketRef = useRef(null);
  const peerRef = useRef(null);


  let roomName = "123";

  const getUserCamera = () => {
    console.log("123123****");
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })
      .then((stream) => {

        //비디오 tag에 stream 추가 
        // let video = myVideoRef.current
        // video.srcObject = stream

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
        if (!(peerRef.current && socketRef.current)) {
          return;
        }
        console.log("123123****1");
        console.log(socketRef.current);

        stream.getTracks().forEach((track) => {
          if (!peerRef.current) {
            return;
          }
          peerRef.current.addTrack(track, stream);
        });
        console.log("123123****2");
        console.log(socketRef.current);

        //이 부분이 실행이 안된다..
        //둘다 들어와있는 상태에서 새로고침해야 되는데??? 그럼 따로들어왔을때 인지를 못하는 건가?
        peerRef.current.onicecandidate = (e) => {
          console.log("recv candidate");
          console.log(e);//
          console.log("recv candidate");

          if (e.candidate) {
            // console.log("123123****3");
            if (!socketRef.current) {
              return;
            }
            console.log("recv candidate");
            socketRef.current.emit("candidate", e.candidate, roomName);
          }
        };

        console.log("123123****3");
        console.log(socketRef.current);


        peerRef.current.ontrack = (e) => {
          if (remoteVideoRef.current) {
            // console.log("e.streams[0]");
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        };
      })
      .catch((error) => {
        console.log(error)
      })
  }

  const createOffer = async () => {
    console.log("create Offer");
    if (!(peerRef.current && socketRef.current)) {
      return;
    }
    try {
      // offer 생성
      const sdp = await peerRef.current.createOffer();
      // 자신의 sdp로 LocalDescription 설정 
      peerRef.current.setLocalDescription(sdp);
      console.log("sent the offer");
      // offer 전달
      socketRef.current.emit("offer", sdp, roomName);
    } catch (e) {
      console.error(e);
    }
  };
  const createAnswer = async (sdp) => {
    // sdp : PeerA에게서 전달받은 offer

    console.log("createAnswer");
    if (!(peerRef.current && socketRef.current)) {
      return;
    }

    try {
      // PeerA가 전달해준 offer를 RemoteDescription에 등록해 줍시다.
      peerRef.current.setRemoteDescription(sdp);

      // answer생성해주고
      const answerSdp = await peerRef.current.createAnswer();

      // answer를 LocalDescription에 등록해 줍니다. (PeerB 기준)
      peerRef.current.setLocalDescription(answerSdp);
      console.log("sent the answer");
      socketRef.current.emit("answer", answerSdp, roomName);


    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {

    // 소켓 연결
    socketRef.current = new io("http://43.201.165.228:3000");

    getUserCamera();

    peerRef.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        {
          urls: "turn:a.relay.metered.ca:80",
          username: "58e686be527c0068cfb5ba6d",
          credential: "ka326fwi9Pp+JP8w",
        },
      ],
    });

    // 기존 유저가 있고, 새로운 유저가 들어왔다면 오퍼생성
    socketRef.current.on("all_users", (allUsers) => {

      console.log("all_users");
      console.log(allUsers); //상대 유저가 누군지 피어 id를 가져와줌
      console.log("all_users");

      if (allUsers.length > 0) {
        createOffer();
      }
    });

    // offer를 전달받은 PeerB만 해당됩니다
    // offer를 들고 만들어둔 answer 함수 실행
    socketRef.current.on("getOffer", (sdp) => {
      console.log("getOffer");
      console.log(sdp);
      console.log("getOffer");


      console.log("recv Offer");
      createAnswer(sdp);
    });
    // answer를 전달받을 PeerA만 해당됩니다.
    // answer를 전달받아 PeerA의 RemoteDescription에 등록
    socketRef.current.on("getAnswer", (sdp) => {
      console.log("getAnswer");
      console.log(sdp);
      console.log("getAnswer");


      console.log("recv Answer");
      if (!peerRef.current) {
        return;//
      }
      peerRef.current.setRemoteDescription(sdp);

      // window.location.replace("/");//

    });

    // 서로의 candidate를 전달받아 등록
    socketRef.current.on("getCandidate", async (candidate) => {
      console.log("getCandidate");
      console.log(candidate);
      console.log(candidate);
      console.log("getCandidate");
      if (!peerRef.current) {
        return;
      }

      await peerRef.current.addIceCandidate(candidate);
    });

    // 마운트시 해당 방의 roomName을 서버에 전달
    socketRef.current.emit("join_room", {
      room: roomName,
    });



    return () => {
      // 언마운트시 socket disconnect
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (peerRef.current) {
        peerRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myVideoRef]);


  return (
    <div>
      <video ref={myVideoRef} autoPlay />
      <video ref={remoteVideoRef} autoPlay />
    </div>
  );
}

export default App;
