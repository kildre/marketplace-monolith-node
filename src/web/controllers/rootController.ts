import path from 'path';
import log from '../../service/loggingService';

export const renderIndex = (_req, res) => {
    log.info('Rendering index ...');
    res.sendFile(path.join(__dirname, '../../../public', 'index.html'));

    return res;
};
