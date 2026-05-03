"use client";
import { TrendingUp, UserPlus } from "lucide-react";
import { Button } from "../ui/button";

export default function HomeSidebar() {
    return (
        <div className="glass-surface-strong hidden h-screen w-90 flex-col px-3 py-7 font-serif md:flex">

            <div className="flex flex-col border-b">
                <p className="flex gap-2 items-center font-semibold"><TrendingUp className="text-blue-500" /> Top trends this week</p>
                <div className="h-30 border mt-3 rounded-lg bg-black/5 dark:bg-white/5 dark:shadow-white dark:hover:shadow-xs cursor-pointer transition-all duration-300 hover:shadow-sm overflow-clip">
                    <img src="/kohli2.jpg" alt="" className="h-full w-full object-cover object-top" />
                </div>
                <div className="h-30 border my-3 rounded-lg bg-black/5 dark:bg-white/5 dark:shadow-white dark:hover:shadow-xs cursor-pointer transition-all duration-300 hover:shadow-sm overflow-clip">
                    <img src="/cse.jpg" alt="" className="h-full w-full object-cover" />
                </div>
                <p className="text-right text-[0.9rem] mr-1 text-blue-500 cursor-pointer hover:text-blue-600">See more</p>
            </div>

            <p className="text-[1.1rem] font-semibold flex items-center gap-2 mt-3"> <UserPlus className="h-5 text-blue-500" /> People you can follow</p>

            <div className="mt-5 flex flex-col gap-5">
                <div className="box flex items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <img src="/Jensen.png" alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col w-35">
                        <p className="text-[0.9rem]">Jensen Huang</p>
                        <p className="opacity-50 text-[0.8rem]">CEO and Founder, Nvidia</p>
                    </div>
                    <Button className="h-8 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white">
                        Follow
                    </Button>
                </div>

                <div className="box flex items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <img src="/Elon.png" alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col w-35">
                        <p className="text-[0.9rem]">Elon Musk</p>
                        <p className="opacity-50 text-[0.8rem]">CEO and Founder, Tesla & SpaceX</p>
                    </div>
                    <Button className="h-8 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white">
                        Follow
                    </Button>
                </div>

                <div className="box flex items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <img src="/Mark.png" alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col w-35">
                        <p className="text-[0.9rem]">Mark Zuck</p>
                        <p className="opacity-50 text-[0.8rem]">CEO and Founder, Facebook</p>
                    </div>
                    <Button className="h-8 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white">
                        Follow
                    </Button>
                </div>
            </div>
            <p className="text-right text-[0.9rem] mr-1 text-blue-500 cursor-pointer hover:text-blue-600">See more</p>
        </div>
    );
}
