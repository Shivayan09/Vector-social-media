"use client";
import { Home, Search, Bell, User, Plus, TrendingUp, UserPlus, Compass, Lightbulb, Dumbbell, Activity, Trophy, Shuffle } from "lucide-react";
import { Button } from "../ui/button";

export default function HomeSidebar() {
    return (
        <div className="hidden md:flex neo-sidebar-shell w-90 h-screen flex-col py-7 px-3 font-serif">

            <div className="flex flex-col border-b neo-border">
                <p className="flex gap-2 items-center font-semibold neo-text"><TrendingUp className="text-blue-500" /> Top trends this week</p>
                <div className="h-30 mt-3 rounded-lg bg-blue-950/40 cursor-pointer transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] overflow-clip border-3 neo-border-soft shadow-[6px_6px_0_0_rgba(15,23,42,0.85)]">
                    <img src="/kohli2.jpg" alt="" className="h-full w-full object-cover object-top" />
                </div>
                <div className="h-30 my-3 rounded-lg bg-blue-950/40 cursor-pointer transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px] overflow-clip border-3 neo-border-soft shadow-[6px_6px_0_0_rgba(15,23,42,0.85)]">
                    <img src="/cse.jpg" alt="" className="h-full w-full object-cover" />
                </div>
                <p className="text-right text-[0.9rem] mr-1 text-blue-500 cursor-pointer hover:text-blue-600">See more</p>
            </div>

            <p className="text-[1.1rem] font-semibold flex items-center gap-2 mt-3 neo-text"> <UserPlus className="h-5 text-blue-500" /> People you can follow</p>

            <div className="mt-5 flex flex-col gap-5">
                <div className="box flex items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-blue-950/40 overflow-hidden border neo-border-soft">
                        <img src="/Jensen.png" alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col w-35">
                        <p className="text-[0.9rem] neo-text">Jensen Huang</p>
                        <p className="neo-muted text-[0.8rem]">CEO and Founder, Nvidia</p>
                    </div>
                    <Button className="h-8 cursor-pointer">
                        Follow
                    </Button>
                </div>

                <div className="box flex items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-blue-950/40 overflow-hidden border neo-border-soft">
                        <img src="/Elon.png" alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col w-35">
                        <p className="text-[0.9rem] neo-text">Elon Musk</p>
                        <p className="neo-muted text-[0.8rem]">CEO and Founder, Tesla & SpaceX</p>
                    </div>
                    <Button className="h-8 cursor-pointer">
                        Follow
                    </Button>
                </div>

                <div className="box flex items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-blue-950/40 overflow-hidden border neo-border-soft">
                        <img src="/Mark.png" alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col w-35">
                        <p className="text-[0.9rem] neo-text">Mark Zuck</p>
                        <p className="neo-muted text-[0.8rem]">CEO and Founder, Facebook</p>
                    </div>
                    <Button className="h-8 cursor-pointer">
                        Follow
                    </Button>
                </div>
            </div>
            <p className="text-right text-[0.9rem] mr-1 text-blue-500 cursor-pointer hover:text-blue-600">See more</p>
        </div>
    );
}