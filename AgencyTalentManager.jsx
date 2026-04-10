import { User, PlusSquare, MessageCircle, House, Bell } from "lucide-react";

export const BOTTOM_NAV_ITEMS = [
    {
        key: "feed",
        label: "Feed",
        icon: House,
    },
    {
        key: "notifications",
        label: "Notifications",
        icon: Bell,
    },
    {
        key: "post",
        label: "Post",
        icon: PlusSquare,
    },
    {
        key: "messages",
        label: "Messages",
        icon: MessageCircle,
    },
    {
        key: "profile",
        label: "Profile",
        icon: User,
    }
];