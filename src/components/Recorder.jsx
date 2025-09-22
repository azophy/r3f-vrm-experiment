import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const RecorderWithRef = forwardRef((props, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [showPlaybackModal, setShowPlaybackModal] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState(1.0); // Default to no filter
  const [status, setStatus] = useState('Ready to record');
  const [statusType, setStatusType] = useState('ready'); // ready, recording, error

  const canvasRef = useRef(null);
  const playbackRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const processedStreamRef = useRef(null);
  const streamRef = useRef(null);

  // Expose canvasRef setter to parent component
  useImperativeHandle(ref, () => ({
    setCanvasRef: (canvas) => {
      canvasRef.current = canvas;
    }
  }));

  // Update status with styling
  const updateStatus = (message, type = 'ready') => {
    setStatus(message);
    setStatusType(type);
  };

  // Get status class for styling
  const getStatusClass = () => {
    switch (statusType) {
      case 'recording':
        return 'bg-yellow-200 text-gray-800';
      case 'error':
        return 'bg-pink-500 text-white';
      default:
        return 'bg-blue-400 text-white';
    }
  };

  // Select voice anonymization option
  const selectAnonymizationOption = (pitchValue) => {
    setSelectedPitch(pitchValue);
    updateStatus(`Selected pitch: ${pitchValue === 1.0 ? 'No filter' : pitchValue < 1.0 ? 'Chipmunk' : 'Deep'}. Ready to record.`, 'ready');
  };

  // Process audio with pitch shifting
  const processAudio = async (inputStream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    // Create audio processing chain
    const source = audioContext.createMediaStreamSource(inputStream);
    const destination = audioContext.createMediaStreamDestination();

    // Create a script processor for pitch shifting
    const bufferSize = 4096;
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputBuffer = e.inputBuffer.getChannelData(0);
      const outputBuffer = e.outputBuffer.getChannelData(0);

      // Pitch shifting by resampling the audio
      for (let i = 0; i < outputBuffer.length; i++) {
        const scaledIndex = Math.floor(i / selectedPitch);
        if (scaledIndex < inputBuffer.length) {
          outputBuffer[i] = inputBuffer[scaledIndex] * 0.8; // Reduce volume slightly
        } else {
          outputBuffer[i] = 0; // Silence if out of bounds
        }
      }
    };

    // Connect audio nodes
    source.connect(processor);
    processor.connect(destination);

    return destination.stream;
  };

  // Capture canvas as video stream
  const captureCanvasStream = () => {
    if (!canvasRef.current) {
      throw new Error('Canvas not available');
    }
    
    // Capture canvas as media stream
    const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
    return canvasStream;
  };

  // Start recording
  const startRecording = async () => {
    try {
      updateStatus('Requesting microphone and preparing recording...', 'ready');

      // Get user media (audio only)
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      streamRef.current = audioStream;

      // Process audio
      const processedAudioStream = await processAudio(audioStream);
      processedStreamRef.current = processedAudioStream;

      // Capture canvas stream
      const canvasStream = captureCanvasStream();
      
      // Combine canvas video track with processed audio track
      const combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        processedAudioStream.getAudioTracks()[0]
      ]);

      // Start recording
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=h264,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      const recordedChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        updateStatus('Recording complete!', 'ready');
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      updateStatus('Recording 3D scene with voice anonymization...', 'recording');
    } catch (error) {
      console.error('Error starting recording:', error);
      updateStatus(`Error: ${error.message}`, 'error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (processedStreamRef.current) {
        processedStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Show playback modal
  const showPlayback = () => {
    if (recordedBlob) {
      setShowPlaybackModal(true);
    }
  };

  // Close playback modal
  const closePlaybackModal = () => {
    setShowPlaybackModal(false);
    if (playbackRef.current) {
      playbackRef.current.pause();
      playbackRef.current.src = '';
    }
  };

  // Set playback source when modal opens
  useEffect(() => {
    if (showPlaybackModal && recordedBlob && playbackRef.current) {
      const url = URL.createObjectURL(recordedBlob);
      playbackRef.current.src = url;
    }
  }, [showPlaybackModal, recordedBlob]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (showPlaybackModal && playbackRef.current) {
        closePlaybackModal();
      }
    };
  }, [showPlaybackModal]);

  return (
    <>
      <div className="fixed bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 w-80">
        <h2 className="text-lg font-bold mb-2">🎥 3D Scene Recorder</h2>
        <p className="text-sm text-gray-600 mb-3">Record VRM avatar with voice anonymization</p>

        <div className={`p-2 rounded mb-3 text-center text-sm font-medium ${getStatusClass()}`}>
          {status}
        </div>

        <div className="mb-3">
          <h3 className="text-sm font-medium mb-2">Voice Anonymization</h3>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                selectedPitch === 1.0 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              onClick={() => selectAnonymizationOption(1.0)}
            >
              No Filter
            </button>
            <button
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                selectedPitch === 0.7 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              onClick={() => selectAnonymizationOption(0.7)}
            >
              Chipmunk
            </button>
            <button
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                selectedPitch === 1.3 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              onClick={() => selectAnonymizationOption(1.3)}
            >
              Deep
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={`flex-1 py-2 px-4 rounded font-medium text-white transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
            onClick={toggleRecording}
          >
            {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
          </button>
          
          <button
            className={`flex-1 py-2 px-4 rounded font-medium text-white transition-colors ${
              recordedBlob 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={showPlayback}
            disabled={!recordedBlob}
          >
            ▶ Play
          </button>
        </div>
      </div>

      {/* Playback Modal */}
      {showPlaybackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Recorded Video</h3>
              <button 
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={closePlaybackModal}
              >
                &times;
              </button>
            </div>
            <video 
              ref={playbackRef}
              controls
              className="w-full rounded"
            />
            <div className="mt-3 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={closePlaybackModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// Canvas capture component to get access to the WebGL canvas
export const CanvasCapture = ({ setCanvasRef }) => {
  // Get the canvas element from the DOM
  useEffect(() => {
    // Wait a bit for the canvas to be created
    const timeoutId = setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        setCanvasRef(canvas);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [setCanvasRef]);

  return null;
};

export const Recorder = RecorderWithRef;