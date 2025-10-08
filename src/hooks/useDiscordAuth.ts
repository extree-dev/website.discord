import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useDiscordAuth = () => {
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        const userId = params.get("userId");

        if (token) localStorage.setItem("auth_token", token);
        if (userId) localStorage.setItem("user_data", JSON.stringify({ id: parseInt(userId) }));

        // Убираем query params из URL
        if (token || userId) {
            window.history.replaceState({}, "", location.pathname);
        }
    }, [location]);
};
