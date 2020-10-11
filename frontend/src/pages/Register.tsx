import React, { useState } from 'react'

interface RegisterProps
{

}

export const Register: React.FC<RegisterProps> = ({ }) =>
{
    const [email, setEmail] = useState("");

    return <div>register page</div>;
}