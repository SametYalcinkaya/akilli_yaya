import { useEffect, useRef, useState } from "react";

export function useWebSocket(url) {
    const [data, setData] = useState(null);
    const [status, setStatus] = useState("disconnected");
    const socketRef = useRef(null);

    useEffect(() => {
        if (!url) return undefined;

        const ws = new WebSocket(url);
        socketRef.current = ws;
        setStatus("connecting");

        ws.onopen = () => setStatus("connected");
        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                setData(payload);
            } catch (error) {
                console.error("WebSocket parse error", error);
            }
        };
        ws.onclose = () => setStatus("disconnected");
        ws.onerror = () => setStatus("error");

        return () => {
            ws.close();
        };
    }, [url]);

    const send = (message) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        }
    };

    return { data, status, send };
}
