import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaUserPlus, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { useNavigate } from 'react-router-dom';

function App() {

  const [roomId, setRoomId] = useState('');
const [peers, setPeers] = useState([]);
const [isMicOn, setIsMicOn] = useState(true);
const [isCameraOn, setIsCameraOn] = useState(true);
const socketRef = useRef();
const userVideoRef = useRef();
const peersRef = useRef([]);
const streamRef = useRef();
const navigate = useNavigate();


useEffect(() => {
    socketRef.current = io.connect('http://localhost:5050');

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            streamRef.current = stream;
            if (userVideoRef.current) {
                userVideoRef.current.srcObject = stream;
            }

            socketRef.current.emit('join room', roomId);

            socketRef.current.on('all users', users => {
                const peers = [];
                users.forEach(userId => {
                    const peer = createPeer(userId, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userId,
                        peer,
                    });
                    peers.push(peer);
                });
                setPeers(peers);
            });

            socketRef.current.on('user joined', payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                });
                setPeers(users => [...users, peer]);
            });

            socketRef.current.on('receiving returned signal', payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        })
        .catch(err => {
            console.error("Error accessing media devices:", err);
        });

    return () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
}, [roomId]);


const toggleMic = () => {
    const audioTracks = streamRef.current.getAudioTracks();
    audioTracks.forEach(track => {
        track.enabled = !track.enabled;
    });
    setIsMicOn(prev => !prev);
};


const toggleCamera = () => {
    const videoTracks = streamRef.current.getVideoTracks();
    videoTracks.forEach(track => {
        track.enabled = !track.enabled;
    });
    setIsCameraOn(prev => !prev);
};


const createPeer = (userToSignal, callerID, stream) => {
    const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
    });

    peer.on('signal', signal => {
        socketRef.current.emit('sending signal', { userToSignal, callerID, signal });
    });

    return peer;
};


const addPeer = (incomingSignal, callerID, stream) => {
    const peer = new Peer({
        initiator: false,
        trickle: false,
        stream,
    });

    peer.on('signal', signal => {
        socketRef.current.emit('returning signal', { signal, callerID });
    });

    peer.signal(incomingSignal);

    return peer;
};


const handleRoomCreate = () => {
    const newRoomId = Math.random().toString(36).substring(7);
    setRoomId(newRoomId);
};
const handleRoomJoin = (e) => {
    e.preventDefault();
};


const Video = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        });
    }, [peer]);

    return (
        <div>
            <video playsInline autoPlay ref={ref} />
            <div>Participant</div>
        </div>
    );
};


  return (
    <div>
        <div>
            <video playsInline muted ref={userVideoRef} autoPlay/>
            <div>You</div>
        </div>
        {peers.length > 0 ? (
            peers.map((peer, index) => (
                <Video key={index} peer={peer} />
            ))
        ) : (
            <div>
                <p>Waiting for a participant...</p>
            </div>
        )}
        <div>
    <button onClick={toggleMic}>
        {isMicOn ? <FaMicrophone/> : <FaMicrophoneSlash/>}
        {isMicOn ? "Mute" : "Unmute"}
    </button>
    <button onClick={toggleCamera}>
        {isCameraOn ? <FaCamera className/> : <FaCamera/>}
        {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
    </button>
</div>
    </div>
);
}

export default App;
