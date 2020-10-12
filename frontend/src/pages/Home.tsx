import React from "react";
import { RouteComponentProps } from 'react-router-dom';
import { useUsersQuery } from "../generated/graphql";

export const Home: React.FC<RouteComponentProps> = () =>
{
   const { data } = useUsersQuery({ fetchPolicy: "network-only" })

   if (!data) {
      return <div>loading...</div>
   }

   return (
      <div>
         <div>Users:</div>
         <ul>
            {data.users.map(user =>
            {
               return <li key={user.id}>{user.id} {user.email}</li>
            })}
         </ul>
      </div>
   );
};