import path from 'path';

export const renderIndex = (_req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
};
