"use client";

import ExploreSidebar from "@/components/layouts/ExploreSidebar";
import { ExternalLink, Search } from "lucide-react";

export default function Explore() {
    return (
        <div className="flex">
            <div className="w-full py-5 px-7">
                <p className="text-[1.6rem] font-semibold text-center md:text-left">Explore</p>
                <p className="opacity-45 text-center md:text-left">Discover people, posts and ideas</p>
                <div className="flex items-center px-2 gap-2 mt-5 border bg-black/5 rounded-full h-10">
                    <Search className="h-5"/>
                    <input type="text" placeholder="Search" className="outline-0 w-full h-full"/>
                </div>
                <div className="mt-5">
                    <p className="font-semibold">Trending domains</p>
                    <div className="flex justify-between my-5">
                        <div className="box h-35 w-[48%] border rounded-md overflow-clip relative cursor-pointer transition-all duration-300 hover:shadow-md">
                            <p className="absolute z-20 bottom-0 left-0 p-2 w-full flex items-center gap-2 bg-black/30 text-white"><ExternalLink className="text-blue-500"/>Science and technology</p>
                            <img src="/science.webp" alt="" className="h-full w-full object-cover object-bottom"/>
                        </div>
                        <div className="box h-35 w-[48%] border rounded-md overflow-clip relative cursor-pointer transition-all duration-300 hover:shadow-md">
                            <p className="absolute z-20 bottom-0 left-0 p-2 w-full flex items-center gap-2 bg-black/30 text-white"><ExternalLink className="text-blue-500"/>Sports</p>
                            <img src="/kohli2.jpg" alt="" className="h-full w-full object-cover object-top"/>
                        </div>
                    </div>
                </div>
                <div className="mt-5">
                    <p className="font-semibold">Top posts of the week</p>
                    <div className="flex flex-col gap-5 md:flex-row items-center justify-between mt-5">
                        <div className="box h-50 w-[90%] md:w-[32%] border rounded-md px-5 py-4 relative cursor-pointer hover:shadow-md">
                            <p className="text-blue-500">30k likes</p>
                            <p className="absolute top-4 right-4 text-[0.9rem] text-gray-600">#sports</p>
                            <p className="text-[0.9rem] my-2 h-23">Virat Kohli is the best batsman in the world and there is no doubt about it</p>
                            <p>username</p>
                            <p className="text-gray-500 text-[0.8rem]">23/10/2025</p>
                        </div>
                        <div className="box h-50 w-[90%] md:w-[32%] border rounded-md px-5 py-4 relative cursor-pointer hover:shadow-md">
                            <p className="text-blue-500">50k likes</p>
                            <p className="absolute top-4 right-4 text-[0.9rem] text-gray-600">#science</p>
                            <p className="text-[0.9rem] my-2 h-23">Another stellar milestone, some random ass dude invented same fuse no use ai chatbot</p>
                            <p>username</p>
                            <p className="text-gray-500 text-[0.8rem]">23/10/2025</p>
                        </div>
                        <div className="box h-50 w-[90%] md:w-[32%] border rounded-md px-5 py-4 relative cursor-pointer hover:shadow-md">
                            <p className="text-blue-500">20k likes</p>
                            <p className="absolute top-4 right-4 text-[0.9rem] text-gray-600">#politics</p>
                            <p className="text-[0.9rem] my-2 h-23">Donald trump when asked about his plans to reform America : "Bomb Iran"</p>
                            <p>username</p>
                            <p className="text-gray-500 text-[0.8rem]">23/10/2025</p>
                        </div>
                    </div>
                </div>
            </div>
            <ExploreSidebar/>
        </div>
    );
}