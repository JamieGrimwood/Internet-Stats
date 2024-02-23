

export default function Router() {
    return (
        <Routes>
            <Route path="/">
                <Route index element={<LoginPage />} />

                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    )
}