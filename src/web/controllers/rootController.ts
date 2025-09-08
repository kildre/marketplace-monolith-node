import path from 'path';
import log from 'src/service/loggingService';

export const renderIndex = (_req, res) => {
    log.info('Rendering index ...');
    res.sendFile(path.join(__dirname, '../../../public', 'index.html'));

    return res;
};
