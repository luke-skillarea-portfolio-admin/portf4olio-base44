import "../../styles/TopBar.css";
import { FiMenu, FiSearch } from "react-icons/fi";

export default function TopBar({ showAdminButton = false, onMenuClick, onSearchClick }) {
    return (
        <header className="topBar">
            <div
                className="searchBar"
                onClick={onSearchClick}
                style={{ cursor: onSearchClick ? 'pointer' : 'default' }}
            >
                <FiSearch size={16} className="searchIcon" />
                <input
                    type="text"
                    placeholder="Search accounts & posts..."
                    aria-label="Search"
                    readOnly={!!onSearchClick}
                    style={{ cursor: onSearchClick ? 'pointer' : 'text' }}
                />
            </div>
            {showAdminButton && (
                <button
                    className="menuButton"
                    onClick={onMenuClick}
                    title="Menu"
                >
                    <FiMenu size={20} />
                </button>
            )}
        </header>
    );
}
