import React from "react";
import ReactDOM from "react-dom";
import { getAccessToken, setAccessToken } from "./accessToken";
import { App } from "./App";
import { ApolloClient, ApolloLink, Observable, InMemoryCache, HttpLink, ApolloProvider } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { TokenRefreshLink } from "apollo-link-token-refresh";
import jwtDecode from "jwt-decode";

const cache = new InMemoryCache({});

const requestLink = new ApolloLink(
  (operation, forward) =>
    new Observable(observer =>
    {
      let handle: any;
      Promise.resolve(operation)
        .then(operation =>
        {
          const accessToken = getAccessToken();
          if (accessToken) {
            operation.setContext({
              headers: {
                authorization: `bearer ${accessToken}`
              }
            });
          }
        })
        .then(() =>
        {
          handle = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer)
          });
        })
        .catch(observer.error.bind(observer));

      return () =>
      {
        if (handle) handle.unsubscribe();
      };
    })
);

const tokenLink = new TokenRefreshLink({
  accessTokenField: "accessToken",
  isTokenValidOrUndefined: () =>
  {
    const token = getAccessToken();

    if (!token) {
      return true;
    }

    try {
      const { exp } = jwtDecode(token);
      if (Date.now() >= exp * 1000) {
        return false;
      } else {
        return true;
      }
    } catch {
      return false;
    }
  },
  fetchAccessToken: () =>
  {
    return fetch("http://localhost:4000/refresh_token", {
      method: "POST",
      credentials: "include"
    });
  },
  handleFetch: accessToken =>
  {
    setAccessToken(accessToken);
  },
  handleError: err =>
  {
    console.warn("Your refresh token is invalid. Try to relogin");
    console.error(err);
  }
});

const client = new ApolloClient({
  link: ApolloLink.from([
    tokenLink,
    onError(({ graphQLErrors, networkError }) =>
    {
      console.log(graphQLErrors);
      console.log(networkError);
    }),
    requestLink,
    new HttpLink({
      uri: "http://localhost:4000/graphql",
      credentials: "include"
    })
  ]),
  cache
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root")
);