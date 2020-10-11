import {Response} from 'express';

export const sendRefreshToken = (res: Response, token: String) => 
{
    res.cookie(
        "d_id", token, {
            httpOnly: true
        }
    );
};