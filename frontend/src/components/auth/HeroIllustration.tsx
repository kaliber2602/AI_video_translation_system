export default function HeroIllustration() {
  return (
    <div className="relative h-[430px] w-full">

      {/* Sidebar */}

      <div
        className="
        absolute
        left-0
        top-10
        h-[330px]
        w-[90px]
        rounded-[28px]
        bg-white
        shadow-xl
        "
      >
        <div className="flex h-full flex-col items-center pt-8 gap-5">

          <Circle />

          <Circle />

          <Circle />

          <Circle />

          <div className="mt-auto mb-8">

            <Circle />

          </div>

        </div>

      </div>

      {/* Main Screen */}

      <div
        className="
        absolute
        left-20
        top-0
        h-[390px]
        w-[620px]
        rounded-[32px]
        bg-white
        shadow-2xl
        overflow-hidden
        "
      >

        {/* Top Bar */}

        <div className="flex h-16 items-center px-8 border-b">

          <div className="flex gap-2">

            <Dot color="#FF5F57"/>

            <Dot color="#FEBC2E"/>

            <Dot color="#28C840"/>

          </div>

        </div>

        {/* Video */}

        <div className="flex h-[220px] items-center justify-center bg-slate-100">

          <div
            className="
            flex
            h-24
            w-24
            items-center
            justify-center
            rounded-full
            bg-[#22C7A9]
            text-white
            text-4xl
            "
          >

            ▶

          </div>

        </div>

        {/* Transcript */}

        <div className="px-8 py-6">

          <Line w="70%" />

          <Line w="95%" />

          <Line w="85%" />

          <Line w="90%" />

          <Line w="60%" />

        </div>

      </div>

      {/* Floating */}

      <Card
        title="AI Translation"
        top="40px"
        right="-30px"
      />

      <Card
        title="Subtitle"
        top="130px"
        right="-60px"
      />

      <Card
        title="Voice Clone"
        top="220px"
        right="-25px"
      />

      <Card
        title="Knowledge Graph"
        top="315px"
        right="-75px"
      />

    </div>
  )
}

function Circle(){

    return(

        <div className="h-12 w-12 rounded-2xl bg-[#F3F6F8]" />

    )

}

function Dot({color}:{color:string}){

    return(

        <div
        style={{background:color}}
        className="h-3 w-3 rounded-full"
        />

    )

}

function Line({w}:{w:string}){

    return(

        <div
        style={{width:w}}
        className="mb-4 h-3 rounded-full bg-slate-200"
        />

    )

}

function Card({

    title,

    top,

    right

}:{

    title:string

    top:string

    right:string

}){

    return(

        <div

        style={{

            top,

            right

        }}

        className="
        absolute
        flex
        items-center
        gap-3
        rounded-2xl
        bg-white
        px-5
        py-4
        shadow-xl
        "

        >

            <div className="h-10 w-10 rounded-xl bg-[#22C7A9]/20"/>

            <div>

                <div className="font-semibold">

                    {title}

                </div>


            </div>

        </div>

    )

}