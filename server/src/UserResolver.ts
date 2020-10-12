import {Arg, Ctx, Field, Int, Mutation, ObjectType, Query, Resolver, UseMiddleware} from 'type-graphql'; 
import { User } from './entity/User';
import {compare, hash} from 'bcryptjs';
import { MyContext } from './MyContext';
import { createAccessToken, createRefreshToken } from './auth';
import { isAuth } from './isAuth';
import { getConnection } from 'typeorm';
import { verify } from 'jsonwebtoken';
import { sendRefreshToken } from './sendRefreshToken';

@ObjectType()
class LoginResponse {
   @Field()
   accessToken: String 
   @Field(() => User)
   user: User;
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
    bye(@Ctx() {payload} : MyContext)
    {
        return `Your user id is ${payload?.userId}`;
    }

    @Query(() => [User])
    users(){
        return User.find();
    }

    @Query(() => User, {nullable: true})
    me(@Ctx() context: MyContext){
        const authorization = context.req.headers["authorization"];

        if(!authorization)
        {
            return null;
        }
        try 
        {
            const token = authorization?.split(" ")[1];
            const payload: any = verify(token, process.env.ACCESS_TOKEN_SECRET!);
            return User.findOne(payload.userId);
        } catch (error) 
        {
            return null;
        }
    }

    @Mutation(() => Boolean)
    async logout(@Ctx() {res}: MyContext) : Promise<Boolean> 
    {
        sendRefreshToken(res, "");

        return true;
    }

    @Mutation(() => Boolean)
    async revokeRefreshTokensForUser(
        @Arg("userId", () => Int) userId: number
    ) : Promise<Boolean> 
    {
        await getConnection().getRepository(User).increment({id: userId}, "tokenVersion", 1);

        return true;
    }

    @Mutation(() => LoginResponse)
    async login(
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Ctx() {res} : MyContext
    ) : Promise<LoginResponse> 
    {
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
            accessToken: createAccessToken(user),
            user
        }
    }
 
    @Mutation(() => Boolean)
    async register(
        @Arg("email") email: string,
        @Arg("password") password: string
    ) : Promise<Boolean> 
    {
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