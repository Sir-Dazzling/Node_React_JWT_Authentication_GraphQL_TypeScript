import {Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver, UseMiddleware} from 'type-graphql'; 
import { User } from './entity/User';
import {compare, hash} from 'bcryptjs';
import { MyContext } from './MyContext';
import { createAccessToken, createRefreshToken } from './auth';
import { isAuth } from './isAuth';

@ObjectType()
class LoginResponse {
   @Field()
   accessToken: String 
}

@Resolver()
export class UserResolver 
{
    @Query(() => String)
    hello(){
        return "Hi";
    }

    @Query(() => String)
    @UseMiddleware(isAuth)
    bye(@Ctx() {payload} : MyContext){
        console.log('payload', payload);
        return `Your user id is ${payload?.userId}`;
    }

    @Query(() => [User])
    users(){
        return User.find();
    }

    @Mutation(() => LoginResponse)
    async login(
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Ctx() {res} : MyContext
    ) : Promise<LoginResponse> {
        const user = await User.findOne({where: {email}});

        if(!user)
        {
            throw new Error("Invalid credentials");
        }

        const valid = await compare(password, user.password);

        if(!valid)
        {
            throw new Error("Invalid credentials");
        }

        // Login successful then manage cookie
        res.cookie(
            "d_id", 
            createRefreshToken(user),
            {
                httpOnly: true
            }
        );

        return {
            accessToken: createAccessToken(user)
        }
    }
 
    @Mutation(() => Boolean)
    async register(
        @Arg("email") email: string,
        @Arg("password") password: string
    ): Promise<Boolean> {
        const hashedPassword = await hash(password, 12);
        
        try 
        {
            await User.insert({
                email, 
                password: hashedPassword
            });
        } catch (error) 
        {
            console.error(error);
            return false;
        }

        return true;
    }
};