// shared feed for everyone

import TopBar from '../components/layout/TopBar'
import BottomNav from '../components/layout/BottomNav'


export default function Home() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopBar />

            <main style={{ flex: 1 }} />

            <BottomNav />
        </div>
    )
}
